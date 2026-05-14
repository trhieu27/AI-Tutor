const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { Document } = require('../db/models');
const { authMiddleware } = require('../middleware/auth');
const { requireDocQuota } = require('../utils/quota');
const { sendNotification } = require('../utils/notifications');
const config = require('../config');
const rag = require('../rag/pipeline');
const { extractText } = require('../rag/extractor');

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);

function findStoredFile(documentId) {
  for (const ext of ['.pdf', '.docx', '.doc']) {
    const filePath = path.join(config.uploadDir, `${documentId}${ext}`);
    if (fs.existsSync(filePath)) return { filePath, ext };
  }
  return null;
}

function normalizeSearchText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function pageMatchScore(pageText, snippetText) {
  const page = normalizeSearchText(pageText);
  const words = normalizeSearchText(snippetText).split(/\s+/).filter(Boolean).slice(0, 90);
  if (!page || words.length < 4) return 0;

  const windowSize = Math.min(10, words.length);
  const starts = [0, Math.max(0, Math.floor((words.length - windowSize) / 2)), Math.max(0, words.length - windowSize)];
  let score = 0;

  for (const start of starts) {
    const phrase = words.slice(start, start + windowSize).join(' ');
    if (phrase && page.includes(phrase)) score += 10;
  }

  const uniqueWords = [...new Set(words.filter(word => word.length > 2))];
  score += uniqueWords.reduce((total, word) => total + (page.includes(word) ? 1 : 0), 0) / Math.max(uniqueWords.length, 1);
  return score;
}

function inferPageNumberFromSnippet(snippetText) {
  const text = String(snippetText || '');
  const match = text.match(/\bOOAD\s+(\d{1,4})\b/i) || text.match(/\b(?:trang|slide|page)\s+(\d{1,4})\b/i);
  if (!match) return null;
  const page = Number(match[1]);
  return Number.isFinite(page) && page > 0 ? page : null;
}

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = config.uploadDir;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext)) cb(null, true);
    else cb(new Error(`Định dạng file không hỗ trợ. Chỉ chấp nhận: ${[...ALLOWED_EXTENSIONS].join(', ')}`));
  },
});

// Background processing: Node.js RAG pipeline
async function processDocumentBackground(documentId, filePath, ownerId) {
  const doc = await Document.findOne({ id: documentId });
  if (!doc) return;

  try {
    await Document.updateOne({ id: documentId }, { $set: { status: 'PROCESSING' } });

    const { collection_name, page_count } = await rag.ingest(filePath, documentId);

    await Document.updateOne(
      { id: documentId },
      { $set: { status: 'READY', page_count, chroma_collection_id: collection_name, updated_at: new Date() } }
    );
    console.log(`✅ Document ${documentId} processed successfully`);

    try {
      await sendNotification(ownerId, 'document_ready', 'Xử lý thành công',
        `Tài liệu "${doc.file_name}" đã sẵn sàng để chat với AI.`,
        { document_id: documentId }
      );
    } catch (notifErr) {
      console.warn('[Notif] Failed to send document_ready notification:', notifErr.message);
    }
  } catch (err) {
    console.error(`❌ Document ${documentId} processing failed:`, err.message, err.cause ?? '');
    try {
      await Document.updateOne({ id: documentId }, { $set: { status: 'FAILED' } });
      await sendNotification(ownerId, 'document_failed', 'Xử lý thất bại',
        `Tài liệu "${doc.file_name}" gặp lỗi. Vui lòng thử lại.`,
        { document_id: documentId }
      );
    } catch (notifErr) {
      console.warn('[Notif] Failed to send document_failed notification:', notifErr.message);
    }
  }
}

// POST /api/v1/documents/upload
router.post('/upload', authMiddleware, requireDocQuota(), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ detail: 'Không có file được tải lên' });

    const sizeMb = req.file.size / (1024 * 1024);
    const documentId = path.basename(req.file.filename, path.extname(req.file.filename));

    const document = await Document.create({
      id: documentId,
      owner_id: req.userId,
      file_name: req.file.originalname,
      file_size_mb: Math.round(sizeMb * 100) / 100,
      status: 'UPLOADING',
    });

    // Start background processing (non-blocking)
    processDocumentBackground(documentId, req.file.path, req.userId).catch(console.error);

    res.status(201).json({
      id: document.id,
      owner_id: document.owner_id,
      file_name: document.file_name,
      file_size_mb: document.file_size_mb,
      page_count: document.page_count,
      status: document.status,
      uploaded_at: document.uploaded_at,
      updated_at: document.updated_at,
    });
  } catch (err) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ detail: `File quá lớn. Tối đa ${config.maxFileSizeMb}MB.` });
    console.error('Upload error:', err);
    res.status(500).json({ detail: err.message || 'Lỗi server' });
  }
});

// POST /api/v1/documents/:documentId/retry
router.post('/:documentId/retry', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findOne({ id: req.params.documentId, owner_id: req.userId });
    if (!doc) return res.status(404).json({ detail: 'Tài liệu không tồn tại.' });

    const storedFile = findStoredFile(req.params.documentId);
    if (!storedFile) return res.status(400).json({ detail: 'Không tìm thấy file tài liệu trên server.' });

    await Document.updateOne({ id: req.params.documentId }, { $set: { status: 'PROCESSING' } });
    processDocumentBackground(req.params.documentId, storedFile.filePath, req.userId).catch(console.error);

    const updated = await Document.findOne({ id: req.params.documentId }).lean();
    res.json({ ...updated, id: updated.id, status: 'PROCESSING' });
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// GET /api/v1/documents
router.get('/', authMiddleware, async (req, res) => {
  try {
    const docs = await Document.find({ owner_id: req.userId }).sort({ uploaded_at: -1 }).limit(100).lean();
    res.json(docs.map(d => ({ ...d, _id: undefined })));
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// GET /api/v1/documents/:documentId/file
router.get('/:documentId/file', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findOne({ id: req.params.documentId, owner_id: req.userId }).lean();
    if (!doc) return res.status(404).json({ detail: 'Tài liệu không tồn tại.' });

    const storedFile = findStoredFile(req.params.documentId);
    if (!storedFile) return res.status(404).json({ detail: 'Không tìm thấy file tài liệu.' });

    const contentTypes = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
    };
    res.setHeader('Content-Type', contentTypes[storedFile.ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.file_name)}"`);
    res.sendFile(path.resolve(storedFile.filePath));
  } catch (err) {
    console.error('Document file error:', err);
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// POST /api/v1/documents/:documentId/locate
router.post('/:documentId/locate', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findOne({ id: req.params.documentId, owner_id: req.userId }).lean();
    if (!doc) return res.status(404).json({ detail: 'Tài liệu không tồn tại.' });

    const snippet = String(req.body?.text || '').trim();
    if (snippet.length < 12) return res.status(400).json({ detail: 'Đoạn trích dẫn quá ngắn.' });

    const storedFile = findStoredFile(req.params.documentId);
    if (!storedFile) return res.status(404).json({ detail: 'Không tìm thấy file tài liệu.' });

    const { pages = [] } = await extractText(storedFile.filePath);
    let best = { page_number: null, score: 0 };
    for (const page of pages) {
      const score = pageMatchScore(page.text, snippet);
      if (score > best.score) best = { page_number: page.page_number, score };
    }

    if (best.page_number && best.score >= 1) {
      return res.json({ page_number: best.page_number });
    }

    const hintedPage = inferPageNumberFromSnippet(snippet);
    if (hintedPage && pages.some(page => Number(page.page_number) === hintedPage)) {
      return res.json({ page_number: hintedPage });
    }

    return res.status(404).json({ detail: 'Không tìm thấy trang chứa trích dẫn.' });
  } catch (err) {
    console.error('Document locate error:', err);
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// GET /api/v1/documents/:documentId
router.get('/:documentId', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findOne({ id: req.params.documentId, owner_id: req.userId }).lean();
    if (!doc) return res.status(404).json({ detail: 'Tài liệu không tồn tại.' });
    res.json({ ...doc, _id: undefined });
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// DELETE /api/v1/documents/:documentId
router.delete('/:documentId', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findOne({ id: req.params.documentId, owner_id: req.userId });
    if (!doc) return res.status(404).json({ detail: 'Tài liệu không tồn tại.' });

    // Delete from ChromaDB
    if (doc.chroma_collection_id) {
      try {
        await rag.deleteDocumentCollection(doc.chroma_collection_id);
      } catch (e) {
        console.warn('RAG delete collection error (ignored):', e.message);
      }
    }

    // Delete file from disk
    for (const ext of ['.pdf', '.doc', '.docx']) {
      const fp = path.join(config.uploadDir, `${req.params.documentId}${ext}`);
      if (fs.existsSync(fp)) { fs.unlinkSync(fp); break; }
    }

    const { ChatSession } = require('../db/models');
    await Document.deleteOne({ id: req.params.documentId });
    await ChatSession.deleteMany({ document_id: req.params.documentId });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

module.exports = router;

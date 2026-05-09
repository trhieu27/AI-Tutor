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

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);

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

    let filePath = null;
    for (const ext of ['.pdf', '.docx', '.doc']) {
      const p = path.join(config.uploadDir, `${req.params.documentId}${ext}`);
      if (fs.existsSync(p)) { filePath = p; break; }
    }
    if (!filePath) return res.status(400).json({ detail: 'Không tìm thấy file tài liệu trên server.' });

    await Document.updateOne({ id: req.params.documentId }, { $set: { status: 'PROCESSING' } });
    processDocumentBackground(req.params.documentId, filePath, req.userId).catch(console.error);

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

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { Document } = require('../db/models');
const { authMiddleware } = require('../middleware/auth');
const { requireDocQuota } = require('../utils/quota');
const { sendNotification, sendAdminRealtimeEvent } = require('../utils/notifications');
const { buildPagination, parsePagination, sendPaginated } = require('../utils/pagination');
const config = require('../config');
const rag = require('../rag/pipeline');
const { extractText } = require('../rag/extractor');
const s3 = require('../utils/s3');
const { ensureLocalFile, processDocumentBackground, cancelDocumentProcessing, deleteDocumentResources } = require('../utils/documentOps');

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);

function findStoredFile(documentId) {
    for (const ext of['.pdf', '.docx', '.doc']) {
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
    limits: { fileSize: 25 * 1024 * 1024 }, // Fixed 25MB limit for all users
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ALLOWED_EXTENSIONS.has(ext)) cb(null, true);
        else cb(new Error(`Định dạng file không hỗ trợ. Chỉ chấp nhận: ${[...ALLOWED_EXTENSIONS].join(', ')}`));
    },
});




// Wrap multer to catch errors with Vietnamese messages
function handleUpload(req, res, next) {
    upload.single('file')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ detail: 'File qu' + '\u00e1' + ' l' + '\u1edbn' + '. T' + '\u1ed1i' + ' ' + '\u0111a' + ' 25MB.' });
            }
            return res.status(400).json({ detail: err.message || 'Loi upload' });
        }
        next();
    });
}

// POST /api/v1/documents/upload
router.post('/upload', authMiddleware, requireDocQuota(), handleUpload, async(req, res) => {
    try {
        if (!req.file) return res.status(400).json({ detail: 'Không có file được tải lên' });

        const sizeMb = req.file.size / (1024 * 1024);
        const documentId = path.basename(req.file.filename, path.extname(req.file.filename));

        // Retry Document.create up to 2 times on timeout
        let document;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                document = await Document.create({
                    id: documentId,
                    owner_id: req.userId,
                    file_name: req.file.originalname,
                    file_size_mb: Math.round(sizeMb * 100) / 100,
                    status: 'UPLOADING',
                });
                break;
            } catch (dbErr) {
                if (attempt < 2 && (dbErr.message || '').includes('timed out')) {
                    console.warn('Upload DB retry attempt', attempt + 1, ':', dbErr.message);
                    await new Promise(r => setTimeout(r, 1000));
                    continue;
                }
                throw dbErr;
            }
        }

        sendAdminRealtimeEvent('document_status_changed', { id: documentId, status: 'UPLOADING', file_name: document.file_name }).catch(console.error);

        // Upload to S3 (non-blocking, don't wait)
        s3.uploadFile(req.file.path, req.file.filename).catch(err =>
            console.error('S3 upload error (file kept locally):', err.message)
        );

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
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ detail: 'File quá lớn. Tối đa 25MB.' });
        console.error('Upload error:', err.message);
        const isTimeout = (err.message || '').includes('timed out');
        res.status(isTimeout ? 503 : 500).json({ detail: isTimeout ? 'Hệ thống tạm bận, vui lòng thử lại.' : 'Lỗi server' });
    }
});

// POST /api/v1/documents/:documentId/retry
router.post('/:documentId/retry', authMiddleware, async(req, res) => {
    try {
        const doc = await Document.findOne({ id: req.params.documentId, owner_id: req.userId });
        if (!doc) return res.status(404).json({ detail: 'Tài liệu không tồn tại.' });

        const storedFile = findStoredFile(req.params.documentId);
        if (!storedFile) return res.status(400).json({ detail: 'Không tìm thấy file tài liệu trên server.' });

        await Document.updateOne({ id: req.params.documentId }, { $set: { status: 'PROCESSING' } });
        sendAdminRealtimeEvent('document_status_changed', { id: req.params.documentId, status: 'PROCESSING', file_name: doc.file_name }).catch(console.error);
        processDocumentBackground(req.params.documentId, storedFile.filePath, req.userId).catch(console.error);

        const updated = await Document.findOne({ id: req.params.documentId }).lean();
        res.json({...updated, id: updated.id, status: 'PROCESSING' });
    } catch (err) {
        res.status(500).json({ detail: 'Lỗi server' });
    }
});

// GET /api/v1/documents
router.get('/', authMiddleware, async(req, res) => {
    try {
        const { page, limit, skip, sort } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
        const query = { owner_id: req.userId };

        // Search filter (escaped case-insensitive regex)
        if (req.query.search) {
            const escaped = String(req.query.search).trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
            query.file_name = new RegExp(escaped, 'i');
        }

        // Status filter
        if (req.query.status && req.query.status !== 'all') {
            query.status = String(req.query.status).toUpperCase();
        }

        // Sorting specification mapping
        let sortSpec = { uploaded_at: -1 };
        if (sort) {
            const mappedSort = {};
            Object.entries(sort).forEach(([key, order]) => {
                if (key === 'name' || key === 'type') {
                    mappedSort.file_name = order;
                } else if (key === 'status') {
                    mappedSort.status = order;
                } else if (key === 'recent' || key === 'uploaded_at') {
                    mappedSort.uploaded_at = order;
                } else {
                    mappedSort[key] = order;
                }
            });
            if (Object.keys(mappedSort).length) sortSpec = mappedSort;
        }

        const [total, docs] = await Promise.all([
            Document.countDocuments(query),
            Document.find(query)
            .select('-summary -quiz -mindmap -study_questions')
            .sort(sortSpec)
            .skip(skip)
            .limit(limit)
            .lean(),
        ]);

        const items = docs.map(d => ({...d, _id: undefined }));
        sendPaginated(res, items, buildPagination({ page, limit, total }), req.query);
    } catch (err) {
        res.status(500).json({ detail: 'Lỗi server' });
    }
});

// GET /api/v1/documents/:documentId/file
router.get('/:documentId/file', authMiddleware, async(req, res) => {
    try {
        const doc = await Document.findOne({ id: req.params.documentId, owner_id: req.userId }).lean();
        if (!doc) return res.status(404).json({ detail: 'Tài liệu không tồn tại.' });

        // Try local file first
        const storedFile = findStoredFile(req.params.documentId);
        if (storedFile) {
            const contentTypes = {
                '.pdf': 'application/pdf',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.doc': 'application/msword',
            };
            res.setHeader('Content-Type', contentTypes[storedFile.ext] || 'application/octet-stream');
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.file_name)}"`);
            return res.sendFile(path.resolve(storedFile.filePath));
        }

        // Try S3
        if (s3.s3Enabled) {
            const s3File = await s3.findFile(req.params.documentId);
            if (s3File) {
                const streamed = await s3.streamToResponse(s3File.filename, res, doc.file_name);
                if (streamed) return;
            }
        }

        return res.status(404).json({ detail: 'Không tìm thấy file tài liệu.' });
    } catch (err) {
        console.error('Document file error:', err);
        res.status(500).json({ detail: 'Lỗi server' });
    }
});

// POST /api/v1/documents/:documentId/locate
router.post('/:documentId/locate', authMiddleware, async(req, res) => {
    try {
        const doc = await Document.findOne({ id: req.params.documentId, owner_id: req.userId }).lean();
        if (!doc) return res.status(404).json({ detail: 'Tài liệu không tồn tại.' });

        const snippet = String((req.body && req.body.text) || '').trim();
        if (snippet.length < 12) return res.status(400).json({ detail: 'Đoạn trích dẫn quá ngắn.' });

        // Try local first, then S3
        const storedFile = await ensureLocalFile(req.params.documentId);
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
router.get('/:documentId', authMiddleware, async(req, res) => {
    try {
        const doc = await Document.findOne({ id: req.params.documentId, owner_id: req.userId }).lean();
        if (!doc) return res.status(404).json({ detail: 'Tài liệu không tồn tại.' });
        res.json({...doc, _id: undefined });
    } catch (err) {
        res.status(500).json({ detail: 'Lỗi server' });
    }
});

// DELETE /api/v1/documents/:documentId
router.delete('/:documentId', authMiddleware, async(req, res) => {
    try {
        // Verify ownership first
        const doc = await Document.findOne({ id: req.params.documentId, owner_id: req.userId });
        if (!doc) return res.status(404).json({ detail: 'Tài liệu không tồn tại.' });

        await deleteDocumentResources(req.params.documentId);
        res.status(204).send();
    } catch (err) {
        const status = err.statusCode || 500;
        res.status(status).json({ detail: err.message || 'Lỗi server' });
    }
});

module.exports = router;
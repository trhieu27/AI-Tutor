const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { Document, ChatSession } = require('../db/models');
const { authMiddleware } = require('../middleware/auth');
const { requireDocQuota } = require('../utils/quota');
const { sendNotification, sendAdminRealtimeEvent } = require('../utils/notifications');
const { buildPagination, parsePagination, sendPaginated } = require('../utils/pagination');
const config = require('../config');
const rag = require('../rag/pipeline');
const { extractText } = require('../rag/extractor');
const s3 = require('../utils/s3');
const { ensureLocalFile, processDocumentBackground, cancelDocumentProcessing, deleteDocumentResources } = require('../utils/documentOps');
const { clearAdminOverviewCache } = require('../utils/cacheInvalidation');

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
    const match = text.match(/\b(?:trang|slide|page)\s+(\d{1,4})\b/i);
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
    limits: { fileSize: config.maxFileSizeMb * 1024 * 1024 }, // Read dynamically from config
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
                return res.status(413).json({ detail: 'File quá lớn. Tối đa ' + config.maxFileSizeMb + 'MB.' });
            }
            return res.status(400).json({ detail: err.message || 'Loi upload' });
        }
        next();
    });
}


// PATCH /api/v1/documents/:id/toggle-share
// Allow users to share/unshare their own document to the public sample library.
router.patch('/:id/toggle-share', authMiddleware, async (req, res) => {
    try {
        const doc = await Document.findOne({ id: req.params.id, owner_id: req.userId });
        if (!doc) return res.status(404).json({ detail: 'Tài liệu không tồn tại hoặc không thuộc về bạn' });
        if (doc.status !== 'READY') return res.status(400).json({ detail: 'Tài liệu chưa sẵn sàng để chia sẻ' });
        if (doc._shared_doc_id) return res.status(400).json({ detail: 'Không thể chia sẻ tài liệu đã clone từ thư viện mẫu' });

        doc.is_sample = !doc.is_sample;
        doc.updated_at = new Date();
        await doc.save();
        clearAdminOverviewCache();

        res.json({ id: doc.id, is_sample: doc.is_sample });
    } catch (err) {
        console.error('Toggle share error:', err.message);
        res.status(500).json({ detail: 'Lỗi cập nhật trạng thái chia sẻ' });
    }
});

// GET /api/v1/documents/samples
// Returns documents grouped by topic. Optionally personalizes topic order
// based on the logged-in user's recent chat activity.
// No auth required — but if a valid token is present, we use it for sorting.

router.get('/samples', async (req, res) => {
    try {
        // ── Optional auth: extract userId if token present ────────────
        let userId = null;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const jwt = require('jsonwebtoken');
                const payload = jwt.verify(authHeader.slice(7), config.jwtSecret, { algorithms: [config.jwtAlgorithm] });
                userId = payload.sub || null;
            } catch (e) { /* invalid token — treat as anonymous */ }
        }

        const docs = await Document.find({ status: 'READY', is_sample: true })
            .select('id file_name file_size_mb page_count summary topic uploaded_at owner_id')
            .sort({ uploaded_at: -1 })
            .limit(30)
            .lean();

        // Global dedup by title — keep the one with a real topic, or most pages
        const globalSeen = new Map();
        for (const doc of docs) {
            let rawName = (doc.file_name || '').replace(/\.[^.]+$/, '');
            try { rawName = decodeURIComponent(rawName); } catch (e) { /* ignore */ }
            const title = rawName.replace(/[_-]/g, ' ').replace(/%20/g, ' ').replace(/\s+/g, ' ').trim();
            const key = title.toLowerCase();
            const ext = ((doc.file_name || '').match(/\.[^.]+$/) || ['.pdf'])[0].toLowerCase();
            const entry = { id: doc.id, title, ext, pages: doc.page_count || 0, sizeMb: doc.file_size_mb || 0, topic: doc.topic || null };

            if (!globalSeen.has(key)) {
                globalSeen.set(key, entry);
            } else {
                const existing = globalSeen.get(key);
                if (!existing.topic && entry.topic) {
                    globalSeen.set(key, entry);
                } else if (existing.topic === entry.topic && entry.pages > existing.pages) {
                    globalSeen.set(key, entry);
                }
            }
        }

        // ── Popularity: count clones per doc (batch query) ─────────────
        const allDocIds = [...globalSeen.values()].map(f => f.id);
        const cloneCounts = await Document.aggregate([
            { $match: { _shared_doc_id: { $in: allDocIds } } },
            { $group: { _id: '$_shared_doc_id', count: { $sum: 1 } } },
        ]);
        const cloneMap = {};
        for (const c of cloneCounts) cloneMap[c._id] = c.count;

        // Attach clone_count to each entry
        for (const file of globalSeen.values()) {
            file.clones = cloneMap[file.id] || 0;
        }

        // Group by topic
        const groups = {};
        for (const file of globalSeen.values()) {
            const topicKey = file.topic || 'Khác';
            if (!groups[topicKey]) groups[topicKey] = [];
            groups[topicKey].push(file);
        }

        // Sort within each topic: most cloned first, then by title
        for (const topicName of Object.keys(groups)) {
            groups[topicName] = groups[topicName]
                .sort((a, b) => b.clones - a.clones || a.title.localeCompare(b.title, 'vi'))
                .slice(0, 6);
        }

        // ── Behavior-based topic ranking ──────────────────────────────
        // Count how many chat sessions the user has per topic
        let userTopicScores = {};
        if (userId) {
            try {
                const { ChatSession } = require('../db/models');
                const recentSessions = await ChatSession.find({ user_id: userId })
                    .select('document_id updated_at')
                    .sort({ updated_at: -1 })
                    .limit(20)
                    .lean();

                if (recentSessions.length > 0) {
                    // Get document IDs → look up their topics
                    const docIds = [...new Set(recentSessions.map(s => s.document_id))];
                    const userDocs = await Document.find({ id: { $in: docIds } })
                        .select('id topic')
                        .lean();

                    const docTopicMap = {};
                    for (const d of userDocs) {
                        docTopicMap[d.id] = d.topic || null;
                    }

                    // Score: more recent sessions = higher weight
                    for (let i = 0; i < recentSessions.length; i++) {
                        const topic = docTopicMap[recentSessions[i].document_id];
                        if (topic && topic !== 'Khác') {
                            // Recent sessions get higher scores (decay by position)
                            userTopicScores[topic] = (userTopicScores[topic] || 0) + (20 - i);
                        }
                    }
                }
            } catch (e) {
                console.warn('[Samples] Behavior scoring failed:', e.message);
            }
        }

        // Build response — top 4 named topics
        const topicNames = Object.keys(groups)
            .filter(name => name !== 'Khác' && groups[name].length > 0);

        // Sort: user's active topics first (by score), then by file count
        topicNames.sort((a, b) => {
            const scoreA = userTopicScores[a] || 0;
            const scoreB = userTopicScores[b] || 0;
            if (scoreA !== scoreB) return scoreB - scoreA; // Higher score first
            return groups[b].length - groups[a].length;    // Fallback: more files first
        });

        const top = topicNames.slice(0, 4);

        const topics = top.map((name) => ({
            id: name.toLowerCase().replace(/\s+/g, '-').slice(0, 30),
            title: name,
            files: groups[name],
        }));

        res.json(topics);
    } catch (err) {
        console.error('Fetch samples error:', err.message);
        res.status(500).json({ detail: 'Lỗi server' });
    }
});

// GET /api/v1/documents/samples/:id/preview
// Public preview for sample documents only — no auth needed.
router.get('/samples/:id/preview', async (req, res) => {
    try {
        const doc = await Document.findOne({ id: req.params.id, status: 'READY' }).lean();
        if (!doc) return res.status(404).json({ detail: 'Tài liệu không tồn tại' });

        const fileDocId = doc._shared_doc_id || doc.id;
        const originalName = doc.file_name || `${fileDocId}.pdf`;

        // Try S3 first
        const s3File = await s3.findFile(fileDocId);
        if (s3File) {
            const streamed = await s3.streamToResponse(s3File.filename, res, originalName);
            if (streamed) return;
        }

        // Fallback to local filesystem
        const localFile = findStoredFile(fileDocId);
        if (localFile) {
            const ext = path.extname(localFile.filePath).toLowerCase();
            const contentTypes = { '.pdf': 'application/pdf', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.doc': 'application/msword' };
            res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);
            return fs.createReadStream(localFile.filePath).pipe(res);
        }

        res.status(404).json({ detail: 'File không tìm thấy' });
    } catch (err) {
        console.error('Sample preview error:', err.message);
        res.status(500).json({ detail: 'Lỗi server' });
    }
});

// GET /api/v1/documents/:id/preview
// Stream the original file (PDF) to the browser for inline viewing.
// Auth via ?token= query param (new tab can't send headers).
router.get('/:id/preview', async (req, res) => {
    const jwt = require('jsonwebtoken');
    const token = req.query.token;
    if (!token) return res.status(401).json({ detail: 'Thiếu token' });
    try {
        const payload = jwt.verify(token, config.jwtSecret, { algorithms: [config.jwtAlgorithm] });
        if (!payload.sub) return res.status(401).json({ detail: 'Token không hợp lệ' });

        const doc = await Document.findOne({ id: req.params.id }).lean();
        if (!doc) return res.status(404).json({ detail: 'Tài liệu không tồn tại' });

        // Resolve original document ID for file lookup
        const fileDocId = doc._shared_doc_id || doc.id;
        const originalName = doc.file_name || `${fileDocId}.pdf`;

        // Try S3 first
        const s3File = await s3.findFile(fileDocId);
        if (s3File) {
            const streamed = await s3.streamToResponse(s3File.filename, res, originalName);
            if (streamed) return;
        }

        // Fallback to local filesystem
        const localFile = findStoredFile(fileDocId);
        if (localFile) {
            const ext = path.extname(localFile.filePath).toLowerCase();
            const contentTypes = { '.pdf': 'application/pdf', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.doc': 'application/msword' };
            res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);
            return fs.createReadStream(localFile.filePath).pipe(res);
        }

        res.status(404).json({ detail: 'File không tìm thấy trên hệ thống lưu trữ' });
    } catch (err) {
        if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
            return res.status(401).json({ detail: 'Token không hợp lệ hoặc hết hạn' });
        }
        console.error('Preview error:', err.message);
        res.status(500).json({ detail: 'Lỗi server' });
    }
});

// POST /api/v1/documents/clone-sample
// Clone a curated/sample document into the user's library.
// The file is not copied — uses _shared_doc_id to reference the original file on S3.
router.post('/clone-sample', authMiddleware, async (req, res) => {
    try {
        const { document_id } = req.body;
        if (!document_id) return res.status(400).json({ detail: 'Thiếu document_id' });

        // Check if already cloned
        const existing = await Document.findOne({ owner_id: req.userId, _shared_doc_id: document_id });
        if (existing) {
            return res.json({
                id: existing.id,
                owner_id: existing.owner_id,
                file_name: existing.file_name,
                file_size_mb: existing.file_size_mb,
                page_count: existing.page_count,
                status: existing.status,
                uploaded_at: existing.uploaded_at,
                updated_at: existing.updated_at,
                already_cloned: true,
            });
        }

        // Find the original document
        const origDoc = await Document.findOne({ id: document_id, status: 'READY' }).lean();
        if (!origDoc) return res.status(404).json({ detail: 'Tài liệu mẫu không tồn tại hoặc chưa sẵn sàng.' });

        // Clone document record (reference original file via _shared_doc_id)
        const cloned = await Document.create({
            id: uuidv4(),
            owner_id: req.userId,
            file_name: origDoc.file_name,
            file_size_mb: origDoc.file_size_mb,
            page_count: origDoc.page_count,
            status: origDoc.status,
            chroma_collection_id: origDoc.chroma_collection_id,
            summary: origDoc.summary,
            mindmap: origDoc.mindmap,
            quiz: origDoc.quiz,
            study_questions: origDoc.study_questions,
            _shared_doc_id: document_id,
            uploaded_at: new Date(),
            updated_at: new Date(),
        });
        clearAdminOverviewCache();

        res.status(201).json({
            id: cloned.id,
            owner_id: cloned.owner_id,
            file_name: cloned.file_name,
            file_size_mb: cloned.file_size_mb,
            page_count: cloned.page_count,
            status: cloned.status,
            uploaded_at: cloned.uploaded_at,
            updated_at: cloned.updated_at,
        });
    } catch (err) {
        console.error('Clone sample error:', err.message);
        res.status(500).json({ detail: 'Lỗi server' });
    }
});

// POST /api/v1/documents/upload
router.post('/upload', authMiddleware, requireDocQuota(), handleUpload, async (req, res) => {
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

        clearAdminOverviewCache();
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
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ detail: 'File quá lớn. Tối đa ' + config.maxFileSizeMb + 'MB.' });
        console.error('Upload error:', err.message);
        const isTimeout = (err.message || '').includes('timed out');
        res.status(isTimeout ? 503 : 500).json({ detail: isTimeout ? 'Hệ thống tạm bận, vui lòng thử lại.' : 'Lỗi server' });
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
        clearAdminOverviewCache();
        sendAdminRealtimeEvent('document_status_changed', { id: req.params.documentId, status: 'PROCESSING', file_name: doc.file_name }).catch(console.error);
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

        const [total, docs, readyCount, processingCount, failedCount] = await Promise.all([
            Document.countDocuments(query),
            Document.find(query)
                .select('-summary -quiz -mindmap -study_questions')
                .sort(sortSpec)
                .skip(skip)
                .limit(limit)
                .lean(),
            Document.countDocuments({ owner_id: req.userId, ...(query.file_name && { file_name: query.file_name }), status: 'READY' }),
            Document.countDocuments({ owner_id: req.userId, ...(query.file_name && { file_name: query.file_name }), status: { $in: ['PROCESSING', 'UPLOADING'] } }),
            Document.countDocuments({ owner_id: req.userId, ...(query.file_name && { file_name: query.file_name }), status: 'FAILED' }),
        ]);

        const items = docs.map(d => ({ ...d, _id: undefined }));
        const paginationResult = buildPagination({ page, limit, total });
        paginationResult.stats = {
            ready: readyCount,
            processing: processingCount,
            failed: failedCount,
        };
        sendPaginated(res, items, paginationResult, req.query);
    } catch (err) {
        res.status(500).json({ detail: 'Lỗi server' });
    }
});

// GET /api/v1/documents/:documentId/file
router.get('/:documentId/file', authMiddleware, async (req, res) => {
    try {
        const doc = await Document.findOne({ id: req.params.documentId, owner_id: req.userId }).lean();
        if (!doc) return res.status(404).json({ detail: 'Tài liệu không tồn tại.' });

        // For shared docs, file is stored under the original document ID
        const fileId = doc._shared_doc_id || doc.id;

        // Try local file first
        const storedFile = findStoredFile(fileId);
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
            const s3File = await s3.findFile(fileId);
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
router.post('/:documentId/locate', authMiddleware, async (req, res) => {
    try {
        const doc = await Document.findOne({ id: req.params.documentId, owner_id: req.userId }).lean();
        if (!doc) return res.status(404).json({ detail: 'Tài liệu không tồn tại.' });

        const snippet = String((req.body && req.body.text) || '').trim();
        if (snippet.length < 12) return res.status(400).json({ detail: 'Đoạn trích dẫn quá ngắn.' });

        // For shared docs, file is stored under the original document ID
        const fileId = doc._shared_doc_id || doc.id;
        const storedFile = await ensureLocalFile(fileId);
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

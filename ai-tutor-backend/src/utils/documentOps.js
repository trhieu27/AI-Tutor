const fs = require('fs');
const path = require('path');
const { Document, ChatSession } = require('../db/models');
const { sendNotification, sendAdminRealtimeEvent } = require('./notifications');
const config = require('../config');
const rag = require('../rag/pipeline');
const s3 = require('./s3');
const { clearAdminOverviewCache } = require('./cacheInvalidation');
const { generateText } = require('../rag/gemini');

/**
 * Classify a document's topic via Gemini lite and save to DB.
 * Uses file name + sample chunks spread across the document for accuracy.
 * Normalizes against existing topics to avoid duplicates (e.g. "AI" vs "Trí tuệ nhân tạo").
 */
async function classifyAndSaveTopic(documentId, fileName) {
  let name = (fileName || '').replace(/\.[^.]+$/, '');
  try { name = decodeURIComponent(name); } catch (e) { /* ignore */ }
  name = name.replace(/[_-]/g, ' ').replace(/%20/g, ' ').replace(/\s+/g, ' ').trim();

  // ── Gather context: spread chunks across the document ──
  let context = '';
  try {
    const doc = await Document.findOne({ id: documentId }).select('summary chroma_collection_id').lean();
    if (doc?.summary) {
      context = doc.summary.slice(0, 500);
    }
    if (!context && doc?.chroma_collection_id) {
      try {
        const vectorstore = require('../rag/vectorstore');
        const allDocs = await vectorstore.getAllDocuments(doc.chroma_collection_id);
        if (allDocs?.length) {
          // Sample chunks from start, middle, and end for broader coverage
          const indices = [
            0,
            Math.floor(allDocs.length * 0.25),
            Math.floor(allDocs.length * 0.5),
            Math.floor(allDocs.length * 0.75),
            allDocs.length - 1,
          ];
          const unique = [...new Set(indices)].filter(i => i >= 0 && i < allDocs.length);
          context = unique.map(i => allDocs[i]).join('\n').slice(0, 800);
        }
      } catch (e) { /* ignore chromadb errors */ }
    }
  } catch (e) { /* ignore */ }

  const input = [
    name ? `Tên file: "${name}"` : '',
    context ? `Nội dung: ${context}` : '',
  ].filter(Boolean).join('\n');

  if (!input) return;

  // ── Step 1: Classify topic ──
  const rawResult = await generateText(
    `Phân loại tài liệu học thuật này vào MỘT chủ đề ngắn gọn (2-5 từ, tiếng Việt hoặc thuật ngữ gốc nếu phổ biến hơn). Chỉ trả về tên chủ đề, không giải thích.\n\n${input}`,
    { temperature: 0.1, maxTokens: 30, modelTier: 'lite' }
  );
  const rawTopic = rawResult.trim().replace(/^["']+|["']+$/g, '').replace(/^chủ đề:\s*/i, '').slice(0, 50);
  if (!rawTopic) return;

  // ── Step 2: Normalize against existing topics ──
  let finalTopic = rawTopic;
  try {
    const existingTopics = await Document.distinct('topic', { topic: { $ne: null } });
    if (existingTopics.length > 0) {
      const normalizeResult = await generateText(
        `Nhiệm vụ: kiểm tra chủ đề mới có THUỘC CÙNG LĨNH VỰC/MÔN HỌC với chủ đề nào đã có không.

Chủ đề mới: "${rawTopic}"
Danh sách chủ đề đã có: ${existingTopics.map(t => `"${t}"`).join(', ')}

Quy tắc:
- Nếu chủ đề mới là NHÁNH CON, CHUYÊN ĐỀ, hoặc CÙNG MÔN HỌC với một chủ đề đã có → trả về CHÍNH XÁC tên chủ đề đã có đó
  Ví dụ: "Hồi quy tuyến tính" thuộc "Học máy", "KNN" thuộc "Trí tuệ nhân tạo", "UML" thuộc "Phân tích thiết kế hướng đối tượng"
- Nếu chủ đề mới TRÙNG NGHĨA (dù khác ngôn ngữ, viết tắt) với chủ đề đã có → trả về CHÍNH XÁC tên chủ đề đã có đó
- Nếu KHÔNG liên quan đến bất kỳ chủ đề nào → trả về CHÍNH XÁC "${rawTopic}"
- Chỉ trả về tên chủ đề, không giải thích`,
        { temperature: 0, maxTokens: 50, modelTier: 'lite' }
      );
      const normalized = normalizeResult.trim().replace(/^["']+|["']+$/g, '').slice(0, 50);
      if (normalized) finalTopic = normalized;
    }
  } catch (e) {
    console.warn('[Topic] Normalization failed, using raw topic:', e.message);
  }

  await Document.updateOne({ id: documentId }, { $set: { topic: finalTopic } });
  if (finalTopic !== rawTopic) {
    console.log(`[Topic] ${fileName} → "${rawTopic}" → normalized to "${finalTopic}"`);
  } else {
    console.log(`[Topic] ${fileName} → "${finalTopic}"`);
  }
}

/**
 * Find a stored file — checks local filesystem first, then S3.
 * Returns { filePath, ext } if found locally, or null.
 */
function findStoredFile(documentId) {
  for (const ext of ['.pdf', '.docx', '.doc']) {
    const filePath = path.join(config.uploadDir, `${documentId}${ext}`);
    if (fs.existsSync(filePath)) return { filePath, ext };
  }
  return null;
}

/**
 * Ensure a file is available locally for processing.
 * If not on disk, downloads from S3.
 * @returns {{ filePath: string, ext: string } | null}
 */
async function ensureLocalFile(documentId) {
  // 1. Check local first
  const local = findStoredFile(documentId);
  if (local) return local;

  // 2. Try downloading from S3
  if (s3.s3Enabled) {
    const s3File = await s3.findFile(documentId);
    if (s3File) {
      const localPath = await s3.downloadToLocal(s3File.filename, config.uploadDir);
      if (localPath) {
        return { filePath: localPath, ext: s3File.ext };
      }
    }
  }

  return null;
}

// Track active processing AbortControllers
const _processingJobs = new Map();

function cancelDocumentProcessing(documentId) {
  const ac = _processingJobs.get(documentId);
  if (ac) {
    ac.abort();
    _processingJobs.delete(documentId);
    console.log(`[Doc] Cancelled processing for ${documentId}`);
  }
}

async function processDocumentBackground(documentId, filePath, ownerId) {
  const doc = await Document.findOne({ id: documentId });
  if (!doc) return;

  const ac = new AbortController();
  _processingJobs.set(documentId, ac);

  try {
    await Document.updateOne({ id: documentId }, { $set: { status: 'PROCESSING', updated_at: new Date() } });
    clearAdminOverviewCache();
    sendAdminRealtimeEvent('document_status_changed', { id: documentId, status: 'PROCESSING', file_name: doc.file_name }).catch(console.error);

    // Push cho owner để frontend refresh bảng ngay (trước khi LibreOffice convert)
    const { notificationManager } = require('./notifications');
    console.log(`[Doc] Pushing document_processing WS event to owner ${ownerId} for ${documentId}`);
    notificationManager.push(ownerId, {
      type: 'document_processing',
      metadata: { document_id: documentId },
      created_at: new Date().toISOString(),
    }).catch(console.error);

    const { collection_name, page_count } = await rag.ingest(filePath, documentId, { signal: ac.signal });

    const stillExists = await Document.findOne({ id: documentId });
    if (!stillExists) return;

    await Document.updateOne(
      { id: documentId },
      { $set: { status: 'READY', page_count, chroma_collection_id: collection_name, updated_at: new Date() } }
    );
    clearAdminOverviewCache();
    sendAdminRealtimeEvent('document_status_changed', { id: documentId, status: 'READY', file_name: doc.file_name }).catch(console.error);

    // Classify topic in background (non-blocking)
    classifyAndSaveTopic(documentId, doc.file_name).catch(err =>
      console.warn('[Topic] Classification failed:', err.message)
    );

    try {
      await sendNotification(ownerId, 'document_ready', 'Xử lý thành công',
        `Tài liệu "${doc.file_name}" đã sẵn sàng để chat với AI.`,
        { document_id: documentId }
      );
    } catch (notifErr) {
      console.warn('[Notif] Failed to send document_ready notification:', notifErr.message);
    }
  } catch (err) {
    // Aborted = document was deleted during processing, skip everything
    if (err.name === 'AbortError' || ac.signal.aborted) {
      console.log(`[Doc] Processing aborted for ${documentId} (deleted)`);
      return;
    }
    console.error(`Document ${documentId} processing failed:`, err.message, err.cause ?? '');
    try {
      const stillExists = await Document.findOne({ id: documentId });
      if (!stillExists) return;
      await Document.updateOne({ id: documentId }, { $set: { status: 'FAILED', updated_at: new Date() } });
      clearAdminOverviewCache();
      sendAdminRealtimeEvent('document_status_changed', { id: documentId, status: 'FAILED', file_name: doc.file_name }).catch(console.error);
      await sendNotification(ownerId, 'document_failed', 'Xử lý thất bại',
        `Tài liệu "${doc.file_name}" gặp lỗi. Vui lòng thử lại.`,
        { document_id: documentId }
      );
    } catch (notifErr) {
      console.warn('[Notif] Failed to send document_failed notification:', notifErr.message);
    }
  } finally {
    _processingJobs.delete(documentId);
  }
}

async function retryDocumentProcessing(documentId) {
  const doc = await Document.findOne({ id: documentId });
  if (!doc) {
    const err = new Error('Tài liệu không tồn tại');
    err.statusCode = 404;
    throw err;
  }

  // Try local first, then S3
  const storedFile = await ensureLocalFile(documentId);
  if (!storedFile) {
    const err = new Error('Không tìm thấy file tài liệu');
    err.statusCode = 400;
    throw err;
  }

  await Document.updateOne({ id: documentId }, { $set: { status: 'PROCESSING', updated_at: new Date() } });
  clearAdminOverviewCache();
  sendAdminRealtimeEvent('document_status_changed', { id: documentId, status: 'PROCESSING', file_name: doc.file_name }).catch(console.error);
  processDocumentBackground(documentId, storedFile.filePath, doc.owner_id).catch(console.error);
  return Document.findOne({ id: documentId }).lean();
}

async function deleteDocumentResources(documentId, { cascade = false } = {}) {
  // Cancel any in-progress processing job
  cancelDocumentProcessing(documentId);

  const doc = await Document.findOne({ id: documentId });
  if (!doc) {
    const err = new Error('Tài liệu không tồn tại');
    err.statusCode = 404;
    throw err;
  }

  // ── Cascade delete: remove all clones if this is an original doc ──
  // Only triggered by admin delete — owner delete keeps clones alive.
  const isOriginal = !doc._shared_doc_id;
  if (cascade && isOriginal) {
    const clones = await Document.find({ _shared_doc_id: documentId }).select('id').lean();
    if (clones.length > 0) {
      const cloneIds = clones.map(c => c.id);
      console.log(`[Delete] Cascade deleting ${cloneIds.length} clone(s) of ${documentId}`);
      await ChatSession.deleteMany({ document_id: { $in: cloneIds } });
      await Document.deleteMany({ _shared_doc_id: documentId });
      for (const cloneId of cloneIds) {
        sendAdminRealtimeEvent('document_status_changed', { id: cloneId, status: 'DELETED', file_name: doc.file_name }).catch(console.error);
      }
    }
  }

  // ── Reference counting ──────────────────────────────────────────
  // After cascade, re-count to see if shared resources can be cleaned up.

  // The file ID used for storage — either this doc's own file, or the original's
  const fileId = doc._shared_doc_id || documentId;

  // Count other docs that share the same file (via _shared_doc_id or as the original)
  const fileRefCount = await Document.countDocuments({
    id: { $ne: documentId },
    $or: [
      { _shared_doc_id: fileId },          // other clones of the same original
      { id: fileId, _shared_doc_id: null }, // the original doc itself (if we're deleting a clone)
    ],
  });

  // Count other docs that share the same ChromaDB collection
  const chromaRefCount = doc.chroma_collection_id
    ? await Document.countDocuments({
      id: { $ne: documentId },
      chroma_collection_id: doc.chroma_collection_id,
    })
    : 0;

  // ── Cleanup shared resources only if no other refs ───────────────

  if (doc.chroma_collection_id && chromaRefCount === 0) {
    try {
      await rag.deleteDocumentCollection(doc.chroma_collection_id);
    } catch (err) {
      console.warn('RAG delete collection error (ignored):', err.message);
    }
  } else if (chromaRefCount > 0) {
    console.log(`[Delete] Keeping ChromaDB collection (${chromaRefCount} other docs still use it)`);
  }

  if (fileRefCount === 0) {
    // Delete from local disk (original file + converted PDF if any)
    for (const ext of ['.pdf', '.doc', '.docx']) {
      const filePath = path.join(config.uploadDir, `${fileId}${ext}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete from S3
    if (s3.s3Enabled) {
      const s3File = await s3.findFile(fileId);
      if (s3File) {
        await s3.deleteFile(s3File.filename);
      }
    }
  } else {
    console.log(`[Delete] Keeping file ${fileId} (${fileRefCount} other docs still reference it)`);
  }

  // ── Always delete the document record and its chat sessions ─────
  await Document.deleteOne({ id: documentId });
  sendAdminRealtimeEvent('document_status_changed', { id: documentId, status: 'DELETED', file_name: doc.file_name }).catch(console.error);
  await ChatSession.deleteMany({ document_id: documentId });
  clearAdminOverviewCache();
  return doc.toObject();
}

module.exports = {
  findStoredFile,
  ensureLocalFile,
  processDocumentBackground,
  cancelDocumentProcessing,
  retryDocumentProcessing,
  deleteDocumentResources,
};

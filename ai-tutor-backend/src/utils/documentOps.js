const fs = require('fs');
const path = require('path');
const { Document, ChatSession } = require('../db/models');
const { sendNotification, sendAdminRealtimeEvent } = require('./notifications');
const config = require('../config');
const rag = require('../rag/pipeline');
const s3 = require('./s3');

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
    sendAdminRealtimeEvent('document_status_changed', { id: documentId, status: 'PROCESSING', file_name: doc.file_name }).catch(console.error);
    const { collection_name, page_count } = await rag.ingest(filePath, documentId, { signal: ac.signal });

    const stillExists = await Document.findOne({ id: documentId });
    if (!stillExists) return;

    await Document.updateOne(
      { id: documentId },
      { $set: { status: 'READY', page_count, chroma_collection_id: collection_name, updated_at: new Date() } }
    );
    sendAdminRealtimeEvent('document_status_changed', { id: documentId, status: 'READY', file_name: doc.file_name }).catch(console.error);

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
  sendAdminRealtimeEvent('document_status_changed', { id: documentId, status: 'PROCESSING', file_name: doc.file_name }).catch(console.error);
  processDocumentBackground(documentId, storedFile.filePath, doc.owner_id).catch(console.error);
  return Document.findOne({ id: documentId }).lean();
}

async function deleteDocumentResources(documentId) {
  // Cancel any in-progress processing job
  cancelDocumentProcessing(documentId);

  const doc = await Document.findOne({ id: documentId });
  if (!doc) {
    const err = new Error('Tài liệu không tồn tại');
    err.statusCode = 404;
    throw err;
  }

  if (doc.chroma_collection_id) {
    try {
      await rag.deleteDocumentCollection(doc.chroma_collection_id);
    } catch (err) {
      console.warn('RAG delete collection error (ignored):', err.message);
    }
  }

  // Delete from local disk
  for (const ext of ['.pdf', '.doc', '.docx']) {
    const filePath = path.join(config.uploadDir, `${documentId}${ext}`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      break;
    }
  }

  // Delete from S3
  if (s3.s3Enabled) {
    const s3File = await s3.findFile(documentId);
    if (s3File) {
      await s3.deleteFile(s3File.filename);
    }
  }

  await Document.deleteOne({ id: documentId });
  sendAdminRealtimeEvent('document_status_changed', { id: documentId, status: 'DELETED', file_name: doc.file_name }).catch(console.error);
  await ChatSession.deleteMany({ document_id: documentId });
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

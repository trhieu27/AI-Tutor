const fs = require('fs');
const path = require('path');
const { Document, ChatSession } = require('../db/models');
const { sendNotification } = require('./notifications');
const config = require('../config');
const rag = require('../rag/pipeline');

function findStoredFile(documentId) {
  for (const ext of ['.pdf', '.docx', '.doc']) {
    const filePath = path.join(config.uploadDir, `${documentId}${ext}`);
    if (fs.existsSync(filePath)) return { filePath, ext };
  }
  return null;
}

async function processDocumentBackground(documentId, filePath, ownerId) {
  const doc = await Document.findOne({ id: documentId });
  if (!doc) return;

  try {
    await Document.updateOne({ id: documentId }, { $set: { status: 'PROCESSING', updated_at: new Date() } });
    const { collection_name, page_count } = await rag.ingest(filePath, documentId);

    await Document.updateOne(
      { id: documentId },
      { $set: { status: 'READY', page_count, chroma_collection_id: collection_name, updated_at: new Date() } }
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
    console.error(`Document ${documentId} processing failed:`, err.message, err.cause ?? '');
    try {
      await Document.updateOne({ id: documentId }, { $set: { status: 'FAILED', updated_at: new Date() } });
      await sendNotification(ownerId, 'document_failed', 'Xử lý thất bại',
        `Tài liệu "${doc.file_name}" gặp lỗi. Vui lòng thử lại.`,
        { document_id: documentId }
      );
    } catch (notifErr) {
      console.warn('[Notif] Failed to send document_failed notification:', notifErr.message);
    }
  }
}

async function retryDocumentProcessing(documentId) {
  const doc = await Document.findOne({ id: documentId });
  if (!doc) {
    const err = new Error('Tài liệu không tồn tại');
    err.statusCode = 404;
    throw err;
  }

  const storedFile = findStoredFile(documentId);
  if (!storedFile) {
    const err = new Error('Không tìm thấy file tài liệu trên server');
    err.statusCode = 400;
    throw err;
  }

  await Document.updateOne({ id: documentId }, { $set: { status: 'PROCESSING', updated_at: new Date() } });
  processDocumentBackground(documentId, storedFile.filePath, doc.owner_id).catch(console.error);
  return Document.findOne({ id: documentId }).lean();
}

async function deleteDocumentResources(documentId) {
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

  for (const ext of ['.pdf', '.doc', '.docx']) {
    const filePath = path.join(config.uploadDir, `${documentId}${ext}`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      break;
    }
  }

  await Document.deleteOne({ id: documentId });
  await ChatSession.deleteMany({ document_id: documentId });
  return doc.toObject();
}

module.exports = {
  findStoredFile,
  processDocumentBackground,
  retryDocumentProcessing,
  deleteDocumentResources,
};

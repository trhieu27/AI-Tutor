/**
 * S3 Storage Utility
 * Upload, download, delete files from AWS S3.
 * Falls back to local filesystem if S3 is not configured.
 */
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// ── S3 Client ─────────────────────────────────────────────────────────────────

const s3Enabled = !!(config.s3.bucket && config.s3.accessKeyId && config.s3.secretAccessKey);

let s3Client = null;
if (s3Enabled) {
  s3Client = new S3Client({
    region: config.s3.region,
    credentials: {
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey,
    },
  });
  console.log(`☁️  S3 storage enabled → bucket: ${config.s3.bucket}`);
} else {
  console.log('📁 S3 not configured — using local filesystem');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function s3Key(filename) {
  return `uploads/${filename}`;
}

const CONTENT_TYPES = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
};

// ── Upload ────────────────────────────────────────────────────────────────────

/**
 * Upload a file to S3. The local file (from multer) is read and sent to S3.
 * @param {string} localFilePath - Path to the local file (multer temp)
 * @param {string} filename - S3 object key filename (e.g. "uuid.pdf")
 * @returns {Promise<string>} S3 key
 */
async function uploadFile(localFilePath, filename) {
  if (!s3Enabled) return null;

  const ext = path.extname(filename).toLowerCase();
  const body = fs.readFileSync(localFilePath);

  await s3Client.send(new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: s3Key(filename),
    Body: body,
    ContentType: CONTENT_TYPES[ext] || 'application/octet-stream',
  }));

  console.log(`☁️  Uploaded to S3: ${s3Key(filename)}`);
  return s3Key(filename);
}

// ── Download ──────────────────────────────────────────────────────────────────

/**
 * Download a file from S3 to a local temp path.
 * Used when the backend needs the file locally (RAG ingest, text extraction).
 * @param {string} filename - S3 filename (e.g. "uuid.pdf")
 * @param {string} localDir - Local directory to save to
 * @returns {Promise<string|null>} Local file path or null if not found
 */
async function downloadToLocal(filename, localDir) {
  if (!s3Enabled) return null;

  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: s3Key(filename),
    }));

    fs.mkdirSync(localDir, { recursive: true });
    const localPath = path.join(localDir, filename);
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    fs.writeFileSync(localPath, Buffer.concat(chunks));
    return localPath;
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Stream a file from S3 directly to an HTTP response.
 * Used for PDF preview / file download endpoints.
 * @param {string} filename - S3 filename
 * @param {import('express').Response} res - Express response
 * @param {string} originalName - Original file name for Content-Disposition
 */
async function streamToResponse(filename, res, originalName) {
  if (!s3Enabled) return false;

  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: s3Key(filename),
    }));

    const ext = path.extname(filename).toLowerCase();
    res.setHeader('Content-Type', CONTENT_TYPES[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);
    if (response.ContentLength) {
      res.setHeader('Content-Length', response.ContentLength);
    }
    response.Body.pipe(res);
    return true;
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw err;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * Delete a file from S3.
 * @param {string} filename - S3 filename
 */
async function deleteFile(filename) {
  if (!s3Enabled) return;

  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: config.s3.bucket,
      Key: s3Key(filename),
    }));
    console.log(`☁️  Deleted from S3: ${s3Key(filename)}`);
  } catch (err) {
    console.warn(`S3 delete error (ignored): ${err.message}`);
  }
}

// ── Check existence ───────────────────────────────────────────────────────────

/**
 * Check if a file exists on S3 and return its extension.
 * @param {string} documentId - Document UUID
 * @returns {Promise<{filename: string, ext: string}|null>}
 */
async function findFile(documentId) {
  if (!s3Enabled) return null;

  for (const ext of ['.pdf', '.docx', '.doc']) {
    const filename = `${documentId}${ext}`;
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: config.s3.bucket,
        Key: s3Key(filename),
      }));
      return { filename, ext };
    } catch (err) {
      // File not found with this extension, try next
      continue;
    }
  }
  return null;
}

module.exports = {
  s3Enabled,
  uploadFile,
  downloadToLocal,
  streamToResponse,
  deleteFile,
  findFile,
};

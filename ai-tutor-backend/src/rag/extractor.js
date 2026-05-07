const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

// Cache the ESM import (pdfjs-dist v4 is ESM-only)
let _pdfjs = null;
async function getPdfjs() {
  if (!_pdfjs) {
    _pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return _pdfjs;
}

/**
 * Extract plain text from a PDF buffer using PDF.js (Mozilla).
 */
async function extractPdfText(buffer) {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({ data, useSystemFonts: true });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  let fullText = '';
  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str || '').join(' ') + '\n';
  }

  return { text: fullText, pageCount: numPages };
}

/**
 * Extract plain text from PDF or DOCX/DOC file.
 * Returns { text: string, pageCount: number }
 */
async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);

  if (ext === '.pdf') {
    return extractPdfText(buffer);
  }

  if (ext === '.docx' || ext === '.doc') {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value || '';
    const pageCount = Math.max(1, Math.ceil(text.length / 3000));
    return { text, pageCount };
  }

  throw new Error(`Định dạng file không hỗ trợ: ${ext}`);
}

module.exports = { extractText };

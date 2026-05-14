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
  const pages = [];
  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str || '').join(' ');
    pages.push({ page_number: i, text });
    fullText += text + '\n';
  }

  return { text: fullText, pageCount: numPages, pages };
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
    const pages = Array.from({ length: pageCount }, (_, index) => ({
      page_number: index + 1,
      text: text.slice(index * 3000, (index + 1) * 3000),
    }));
    return { text, pageCount, pages };
  }

  throw new Error(`Định dạng file không hỗ trợ: ${ext}`);
}

module.exports = { extractText };

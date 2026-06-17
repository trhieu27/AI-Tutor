const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Cache the ESM import (pdfjs-dist v4 is ESM-only)
let _pdfjs = null;
async function getPdfjs() {
  if (!_pdfjs) {
    _pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return _pdfjs;
}

/**
 * Convert DOCX/DOC to PDF using LibreOffice headless.
 * Returns the path to the converted PDF, or null if LibreOffice is unavailable.
 *
 * @param {string} filePath - Absolute path to the DOCX/DOC file
 * @returns {string|null} - Path to converted PDF, or null on failure
 */
function convertDocxToPdf(filePath) {
  const dir = path.dirname(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));
  const pdfPath = path.join(dir, `${baseName}.pdf`);

  // If PDF already exists (previous conversion), reuse it
  if (fs.existsSync(pdfPath)) return pdfPath;

  try {
    execFileSync('libreoffice', [
      '--headless',
      '--norestore',
      '--convert-to', 'pdf',
      '--outdir', dir,
      filePath,
    ], {
      timeout: 120_000, // 2 phút timeout cho file lớn
      stdio: 'pipe',
    });

    if (fs.existsSync(pdfPath)) {
      console.log(`[Extractor] Converted DOCX → PDF: ${pdfPath}`);
      return pdfPath;
    }
  } catch (err) {
    console.warn('[Extractor] LibreOffice conversion failed (falling back to mammoth):', err.message);
  }
  return null;
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
 * Fallback: extract text from DOCX using mammoth (no page boundaries).
 */
async function extractDocxTextFallback(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value || '';
  const pageCount = Math.max(1, Math.ceil(text.length / 3000));
  const pages = Array.from({ length: pageCount }, (_, index) => ({
    page_number: index + 1,
    text: text.slice(index * 3000, (index + 1) * 3000),
  }));
  return { text, pageCount, pages };
}

/**
 * Extract plain text from PDF or DOCX/DOC file.
 *
 * For DOCX/DOC: converts to PDF via LibreOffice first for accurate page numbers.
 * Falls back to mammoth if LibreOffice is not available (local dev).
 *
 * Returns { text: string, pageCount: number, pages: Array }
 */
async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);

  if (ext === '.pdf') {
    return extractPdfText(buffer);
  }

  if (ext === '.docx' || ext === '.doc') {
    // Try converting to PDF first for accurate page-level extraction
    const pdfPath = convertDocxToPdf(filePath);
    if (pdfPath) {
      const pdfBuffer = fs.readFileSync(pdfPath);
      return extractPdfText(pdfBuffer);
    }
    // Fallback: mammoth (no page boundaries)
    return extractDocxTextFallback(buffer);
  }

  throw new Error(`Định dạng file không hỗ trợ: ${ext}`);
}

/**
 * Scan PDF pages using PDF.js operators to detect which ones contain images.
 */
async function detectImagePages(buffer) {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({ data, useSystemFonts: true });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const imagePages = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const ops = await page.getOperatorList();
    const hasImage = ops.fnArray.some(function(op) {
      return op === pdfjs.OPS.paintImageXObject ||
             op === pdfjs.OPS.paintImageXObjectRepeat ||
             op === pdfjs.OPS.paintJpegXObject;
    });
    if (hasImage) {
      imagePages.push(i);
    }
  }

  return imagePages;
}

/**
 * Extract images from DOCX using mammoth.
 */
async function extractDocxImages(buffer) {
  const images = [];
  let imageIndex = 0;

  await mammoth.convertToHtml({ buffer }, {
    convertImage: function(element) {
      return element.read('base64').then(function(imageData) {
        images.push({
          contentType: element.contentType || 'image/png',
          base64: imageData,
          index: ++imageIndex,
        });
        return { src: '' };
      });
    }
  });

  return images;
}

module.exports = { extractText, detectImagePages, extractDocxImages };

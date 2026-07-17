const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// Cache the ESM import (pdfjs-dist v4 is ESM-only)
let _pdfjs = null;
async function getPdfjs() {
  if (!_pdfjs) {
    _pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return _pdfjs;
}

/**
 * Convert DOCX/DOC to PDF using LibreOffice headless (async — không block event loop).
 * Returns the path to the converted PDF, or null if LibreOffice is unavailable.
 *
 * @param {string} filePath - Absolute path to the DOCX/DOC file
 * @returns {Promise<string|null>} - Path to converted PDF, or null on failure
 */
async function convertDocxToPdf(filePath) {
  const dir = path.dirname(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));
  const pdfPath = path.join(dir, `${baseName}.pdf`);

  // If PDF already exists (previous conversion), reuse it
  if (fs.existsSync(pdfPath)) return pdfPath;

  try {
    await execFileAsync('libreoffice', [
      '--headless',
      '--norestore',
      '--convert-to', 'pdf',
      '--outdir', dir,
      filePath,
    ], {
      timeout: 120_000, // 2 phút timeout cho file lớn
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
    const pdfPath = await convertDocxToPdf(filePath);
    if (pdfPath) {
      const pdfBuffer = fs.readFileSync(pdfPath);
      const result = await extractPdfText(pdfBuffer);

      // Override page count with Word's own metadata (more accurate than
      // LibreOffice conversion which may render slightly different page counts)
      if (ext === '.docx') {
        const wordPageCount = readDocxPageCount(buffer);
        if (wordPageCount && wordPageCount !== result.pageCount) {
          console.log(`[Extractor] DOCX metadata pages: ${wordPageCount} (LibreOffice: ${result.pageCount})`);
          result.pageCount = wordPageCount;
        }
      }

      return result;
    }
    // Fallback: mammoth (no page boundaries)
    return extractDocxTextFallback(buffer);
  }

  throw new Error(`Định dạng file không hỗ trợ: ${ext}`);
}

/**
 * Read page count from DOCX metadata (docProps/app.xml).
 * Word saves the exact page count here when the file is saved.
 * @param {Buffer} buffer - DOCX file buffer
 * @returns {number|null} - Page count from Word, or null if unavailable
 */
function readDocxPageCount(buffer) {
  try {
    const { execFileSync } = require('child_process');
    const tmpPath = path.join(require('os').tmpdir(), `docx_meta_${Date.now()}.docx`);
    fs.writeFileSync(tmpPath, buffer);
    try {
      const xml = execFileSync('unzip', ['-p', tmpPath, 'docProps/app.xml'], {
        encoding: 'utf8',
        timeout: 5000,
      });
      const match = xml.match(/<Pages>(\d+)<\/Pages>/);
      if (match) return parseInt(match[1], 10);
    } finally {
      try { fs.unlinkSync(tmpPath); } catch (_) {}
    }
  } catch (err) {
    console.warn('[Extractor] Could not read DOCX page metadata:', err.message);
  }
  return null;
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

  await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(function(element) {
        return element.read('base64').then(function(imageData) {
          images.push({
            contentType: element.contentType || 'image/png',
            base64: imageData,
            index: ++imageIndex,
          });
          return { src: 'data:' + (element.contentType || 'image/png') + ';base64,' + imageData.slice(0, 20) };
        });
      })
    }
  );

  return images;
}

module.exports = { extractText, detectImagePages, extractDocxImages };

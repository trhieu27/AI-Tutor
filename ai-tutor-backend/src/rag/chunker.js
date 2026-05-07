/**
 * Split text into overlapping chunks for RAG.
 * Default: 900 chars per chunk, 150 char overlap.
 */
function chunkText(text, chunkSize = 900, overlap = 150) {
  // Normalize whitespace
  const normalized = text.replace(/\r\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();

  const chunks = [];
  let start = 0;

  while (start < normalized.length) {
    let end = start + chunkSize;

    // Try to break at sentence boundary
    if (end < normalized.length) {
      const breakAt = normalized.lastIndexOf('.', end);
      if (breakAt > start + chunkSize * 0.5) {
        end = breakAt + 1;
      }
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk.length > 50) {
      chunks.push(chunk);
    }

    start = end - overlap;
    if (start >= normalized.length) break;
  }

  return chunks;
}

module.exports = { chunkText };

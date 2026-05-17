/**
 * Context Selector — selects the strongest chunks for the final LLM prompt
 *
 * Token-aware selection to avoid context stuffing.
 * Keeps the context compact, relevant, and source-traceable.
 */

// Rough token estimation: ~4 chars per token for mixed Vietnamese/English
const CHARS_PER_TOKEN = 4;

/**
 * Select the best context from re-ranked chunks within token limits.
 *
 * @param {Array<{text, metadata, score, method, rerankScore}>} rerankedChunks
 * @param {object} [options] - { maxTokens, minScore, maxChunks }
 * @returns {{ selectedChunks: Array, contextText: string, tokenEstimate: number }}
 */
function selectContext(rerankedChunks, options = {}) {
  const {
    maxTokens = 6000,
    minScore = 0.15,
    maxChunks = 6,
  } = options;

  if (!rerankedChunks || rerankedChunks.length === 0) {
    return { selectedChunks: [], contextText: '', tokenEstimate: 0 };
  }

  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const selected = [];
  let totalChars = 0;

  for (const chunk of rerankedChunks) {
    // Stop if we've selected enough chunks
    if (selected.length >= maxChunks) break;

    // Filter by minimum score (skip irrelevant chunks)
    const score = chunk.rerankScore ?? chunk.score ?? 0;
    if (score < minScore && selected.length > 0) continue;

    // Check token budget
    const chunkChars = (chunk.text || '').length;
    if (totalChars + chunkChars > maxChars && selected.length > 0) break;

    // Skip near-duplicates
    if (isDuplicateContent(chunk.text, selected)) continue;

    selected.push({
      ...chunk,
      contextIndex: selected.length,
    });
    totalChars += chunkChars;
  }

  // Build formatted context with page-based markers (avoids LLM hallucinating source numbers)
  const contextText = selected
    .map((chunk, i) => {
      const page = chunk.metadata?.page_number;
      const section = chunk.metadata?.section;
      const label = page ? `Trang ${page}` : `Đoạn ${i + 1}`;
      const meta = section ? ` | ${section}` : '';
      return `[${label}${meta}]\n${chunk.text}`;
    })
    .join('\n\n---\n\n');

  return {
    selectedChunks: selected,
    contextText,
    tokenEstimate: Math.ceil(totalChars / CHARS_PER_TOKEN),
  };
}


/**
 * Check if a chunk's content is too similar to already-selected chunks.
 * Uses simple substring overlap heuristic.
 */
function isDuplicateContent(text, selectedChunks) {
  if (!text || selectedChunks.length === 0) return false;

  const normalized = text.slice(0, 300).toLowerCase().replace(/\s+/g, ' ');

  for (const existing of selectedChunks) {
    const existingNorm = (existing.text || '').slice(0, 300).toLowerCase().replace(/\s+/g, ' ');

    // Check for high substring overlap
    const shorter = normalized.length < existingNorm.length ? normalized : existingNorm;
    const longer = normalized.length >= existingNorm.length ? normalized : existingNorm;

    if (longer.includes(shorter.slice(0, Math.floor(shorter.length * 0.7)))) {
      return true;
    }
  }

  return false;
}

module.exports = { selectContext };

/**
 * Hybrid Search — combines vector similarity + keyword matching
 *
 * Merges results from ChromaDB vector search and keyword-based search,
 * deduplicates, normalizes scores, and preserves metadata.
 */

const vectorstore = require('./vectorstore');
const { embedQuery } = require('./gemini');

/**
 * Perform hybrid search combining vector and keyword approaches.
 *
 * @param {string} collectionName - ChromaDB collection
 * @param {string} query - Rewritten query text
 * @param {object} [options] - { nResults, signal }
 * @returns {Promise<Array<{text, metadata, score, method}>>}
 */
async function hybridSearch(collectionName, query, options = {}) {
  const { nResults = 10, signal } = options;

  // Run vector search and keyword search in parallel
  const [vectorResults, keywordResults] = await Promise.all([
    vectorSearch(collectionName, query, nResults, signal),
    keywordSearch(collectionName, query, nResults),
  ]);

  // Merge and deduplicate
  return mergeAndDeduplicate(vectorResults, keywordResults, nResults);
}

/**
 * Vector similarity search via ChromaDB embeddings.
 */
async function vectorSearch(collectionName, query, nResults, signal) {
  try {
    const queryVec = await embedQuery(query, signal ? { signal } : undefined);
    const results = await vectorstore.queryCollectionWithScores(collectionName, queryVec, nResults);
    return results.map(r => ({
      text: r.text,
      metadata: r.metadata || {},
      score: r.score ?? 0,
      method: 'vector',
      chunkId: r.id || null,
    }));
  } catch (err) {
    console.warn('[HybridSearch] Vector search failed:', err.message);
    return [];
  }
}

/**
 * Keyword-based search using ChromaDB document filtering.
 * ChromaDB supports $contains for basic text matching.
 */
async function keywordSearch(collectionName, query, nResults) {
  try {
    // Extract meaningful keywords (skip short/common words)
    const keywords = extractKeywords(query);
    if (keywords.length === 0) return [];

    const results = await vectorstore.searchByKeywords(collectionName, keywords, nResults);
    return results.map((r, i) => ({
      text: r.text,
      metadata: r.metadata || {},
      score: r.score ?? (1 - i * 0.05), // Positional score fallback
      method: 'keyword',
      chunkId: r.id || null,
    }));
  } catch (err) {
    console.warn('[HybridSearch] Keyword search failed:', err.message);
    return [];
  }
}

/**
 * Extract meaningful keywords from query text.
 */
function extractKeywords(query) {
  const stopWords = new Set([
    'là', 'của', 'và', 'các', 'có', 'cho', 'trong', 'đến', 'với', 'từ',
    'này', 'đó', 'được', 'để', 'theo', 'về', 'khi', 'nếu', 'như', 'bằng',
    'hãy', 'gì', 'nào', 'sao', 'thế', 'rằng', 'vì', 'nhưng', 'hay', 'hoặc',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
    'it', 'its', 'they', 'them', 'their', 'not', 'but', 'or', 'and',
  ]);

  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 8); // Limit keyword count
}

/**
 * Merge results from vector and keyword searches.
 * Deduplicates by text similarity, normalizes scores.
 */
function mergeAndDeduplicate(vectorResults, keywordResults, maxResults) {
  const merged = new Map();

  // Add vector results first (typically higher quality)
  for (const result of vectorResults) {
    const key = normalizeChunkKey(result.text);
    if (!merged.has(key)) {
      merged.set(key, { ...result, methods: [result.method] });
    }
  }

  // Add keyword results, boosting score if chunk appears in both
  for (const result of keywordResults) {
    const key = normalizeChunkKey(result.text);
    if (merged.has(key)) {
      const existing = merged.get(key);
      existing.score = Math.min(1, existing.score * 1.2); // Boost for appearing in both
      if (!existing.methods.includes('keyword')) {
        existing.methods.push('keyword');
        existing.method = 'hybrid';
      }
    } else {
      merged.set(key, { ...result, methods: [result.method] });
    }
  }

  // Sort by score descending and limit
  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/**
 * Create a normalized key for deduplication.
 */
function normalizeChunkKey(text) {
  return (text || '').slice(0, 200).toLowerCase().replace(/\s+/g, ' ').trim();
}

module.exports = { hybridSearch, extractKeywords };

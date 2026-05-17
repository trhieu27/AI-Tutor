/**
 * Re-ranker — re-ranks retrieved chunks by relevance to the query
 *
 * Uses LLM to score chunk relevance after initial retrieval.
 * Penalizes duplicated, vague, or weakly related chunks.
 */

const { generateText } = require('./gemini');

/**
 * Re-rank retrieved chunks by relevance to the query.
 *
 * @param {string} query - The rewritten query
 * @param {Array<{text, metadata, score, method}>} chunks - Retrieved chunks
 * @param {object} [options] - { maxChunks, signal }
 * @returns {Promise<Array<{text, metadata, score, method, rerankScore}>>}
 */
async function rerankResults(query, chunks, options = {}) {
  const { maxChunks = 8, signal } = options;

  if (!chunks || chunks.length === 0) return [];
  if (chunks.length <= 2) {
    // Too few to bother re-ranking
    return chunks.map((c, i) => ({ ...c, rerankScore: 1 - i * 0.1 }));
  }

  // Take top candidates for re-ranking (limit LLM cost)
  const candidates = chunks.slice(0, Math.min(chunks.length, maxChunks));

  try {
    const scores = await scoreChunks(query, candidates, signal);
    // Merge scores back and sort
    const scored = candidates.map((chunk, i) => ({
      ...chunk,
      rerankScore: scores[i] ?? chunk.score,
    }));

    // Sort by rerank score descending
    scored.sort((a, b) => b.rerankScore - a.rerankScore);
    return scored;
  } catch (err) {
    console.warn('[Reranker] LLM re-ranking failed, using original order:', err.message);
    // Fallback: return with original scores
    return candidates.map((c, i) => ({ ...c, rerankScore: c.score }));
  }
}

/**
 * Use LLM to score chunk relevance on a 0-10 scale.
 */
async function scoreChunks(query, chunks, signal) {
  const chunkTexts = chunks.map((c, i) =>
    `[${i}] ${c.text.slice(0, 400)}`
  ).join('\n\n');

  const prompt = `Bạn là hệ thống đánh giá mức độ liên quan. Cho câu hỏi và danh sách các đoạn trích từ tài liệu, hãy đánh giá mức độ liên quan của mỗi đoạn.

CÂU HỎI: ${query}

CÁC ĐOẠN TRÍCH:
${chunkTexts}

Hãy trả về ĐÚNG một dòng JSON chứa mảng điểm số (0-10) cho mỗi đoạn, ví dụ: [8, 5, 3, 9, 2]
- 10: Trả lời trực tiếp câu hỏi
- 7-9: Rất liên quan, chứa thông tin hữu ích
- 4-6: Liên quan một phần
- 1-3: Ít liên quan
- 0: Không liên quan

CHỈ trả về mảng JSON, không giải thích:`;

  const result = await generateText(prompt, {
    temperature: 0.0,
    maxTokens: 128,
    signal,
  });

  // Parse the JSON array of scores
  const cleaned = result.trim();
  const match = cleaned.match(/\[[\d\s,\.]+\]/);
  if (!match) {
    throw new Error('Invalid reranker response format');
  }

  const scores = JSON.parse(match[0]).map(s => Math.min(10, Math.max(0, Number(s) || 0)));
  // Normalize to 0-1 range
  return scores.map(s => s / 10);
}

module.exports = { rerankResults };

/**
 * Query Rewriter — rewrites user queries for better retrieval
 *
 * Uses LLM to reformulate vague, short, or context-dependent questions
 * into retrieval-friendly queries while preserving intent and language.
 */

const { generateText } = require('./gemini');

const REWRITE_PROMPT = `Bạn là hệ thống tối ưu truy vấn tìm kiếm. Nhiệm vụ: chuyển đổi câu hỏi của sinh viên thành truy vấn tối ưu để tìm kiếm trong tài liệu học tập.

QUY TẮC:
- Giữ nguyên ngôn ngữ gốc (Việt/Anh)
- Giữ nguyên ý nghĩa, thuật ngữ chuyên ngành và thực thể quan trọng
- Mở rộng viết tắt, từ lóng, câu hỏi mơ hồ thành truy vấn cụ thể
- Sử dụng lịch sử hội thoại để giải quyết đại từ (nó, cái đó, điều này...)
- Thay đại từ bằng thực thể cụ thể từ ngữ cảnh
- Nếu câu hỏi đã rõ ràng → giữ nguyên, không thêm thừa
- KHÔNG trả lời câu hỏi — CHỈ viết lại truy vấn
- CHỈ trả về 1 câu truy vấn duy nhất, không giải thích

`;

/**
 * Rewrite a user query for better retrieval.
 *
 * @param {string} originalQuery - The raw user question
 * @param {Array<{role:string, content:string}>} conversationContext - Recent chat history
 * @param {object} [options] - { signal }
 * @returns {Promise<string>} Rewritten query
 */
async function rewriteQuery(originalQuery, conversationContext = [], options = {}) {
  // Short, clear questions don't need rewriting — save an LLM call
  if (originalQuery.length > 200 || (originalQuery.length > 15 && !needsRewriting(originalQuery, conversationContext))) {
    return originalQuery;
  }

  const contextBlock = conversationContext.length > 0
    ? `\nNGỮ CẢNH CUỘC TRÒ CHUYỆN GẦN ĐÂY:\n${conversationContext.slice(-4).map(m => `${m.role === 'human' ? 'Học sinh' : 'Trợ lý'}: ${m.content.slice(0, 300)}`).join('\n')}\n`
    : '';

  const prompt = `${REWRITE_PROMPT}${contextBlock}\nCÂU HỎI GỐC: ${originalQuery}\n\nCÂU TRUY VẤN ĐÃ VIẾT LẠI:`;

  try {
    const rewritten = await generateText(prompt, {
      temperature: 0.1,
      maxTokens: 256,
      signal: options.signal,
      modelTier: 'lite',
    });

    const cleaned = rewritten.trim().replace(/^["']|["']$/g, '');
    // Sanity check: rewritten query shouldn't be empty or too different in length
    if (!cleaned || cleaned.length < 5 || cleaned.length > originalQuery.length * 5) {
      return originalQuery;
    }
    return cleaned;
  } catch (err) {
    // On any failure, fall back to original query — retrieval must not break
    console.warn('[QueryRewriter] Fallback to original query:', err.message);
    return originalQuery;
  }
}

/**
 * Heuristic: does this query likely need rewriting?
 */
function needsRewriting(query, context) {
  // Very short queries usually need expansion
  if (query.length < 20) return true;
  // Queries with pronouns likely reference conversation context
  if (/\b(nó|điều đó|cái đó|chúng|họ|it|this|that|they|them|those|these)\b/i.test(query)) return true;
  // Queries that are just keywords
  if (query.split(/\s+/).length <= 3) return true;
  // If there's conversation context and the query seems contextual
  if (context.length > 0 && query.length < 60) return true;
  return false;
}

module.exports = { rewriteQuery };

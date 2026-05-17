/**
 * Query Rewriter — rewrites user queries for better retrieval
 *
 * Uses LLM to reformulate vague, short, or context-dependent questions
 * into retrieval-friendly queries while preserving intent and language.
 */

const { generateText } = require('./gemini');

const REWRITE_PROMPT = `Bạn là hệ thống tái cấu trúc truy vấn. Nhiệm vụ: viết lại câu hỏi của người dùng thành câu truy vấn tốt hơn để tìm kiếm thông tin trong tài liệu.

QUY TẮC:
- Giữ nguyên ngôn ngữ gốc (Tiếng Việt hoặc Tiếng Anh)
- Giữ nguyên ý nghĩa và các thực thể quan trọng
- Mở rộng câu hỏi quá ngắn hoặc mơ hồ
- Nếu có ngữ cảnh cuộc trò chuyện, sử dụng để hiểu rõ hơn câu hỏi
- Thay thế đại từ bằng thực thể cụ thể khi có thể
- KHÔNG thêm thông tin không có trong câu hỏi gốc
- KHÔNG trả lời câu hỏi — chỉ viết lại câu truy vấn
- CHỈ trả về câu truy vấn đã viết lại, không giải thích

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

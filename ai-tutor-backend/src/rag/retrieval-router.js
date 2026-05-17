/**
 * Retrieval Router — chooses the best retrieval strategy for each query
 *
 * Routes queries to: Standard RAG, Hybrid RAG, CAG/Prompt Caching,
 * PageIndex/Hierarchical Retrieval, or Combined mode.
 */

const { classifyKnowledgeType, getCachedStaticContext } = require('./knowledge-cache');
const { shouldUseHierarchy } = require('./hierarchy-builder');

/**
 * @typedef {'standard_rag' | 'hybrid_rag' | 'cag_cached' | 'hierarchical' | 'combined'} RetrievalStrategy
 */

/**
 * Choose the best retrieval strategy for a query.
 *
 * @param {string} query - The user query (rewritten)
 * @param {object} documentMetadata - { pageCount, status, updatedAt, uploadedAt, collectionName, ... }
 * @param {Array} conversationContext - Chat history
 * @returns {{ strategy: RetrievalStrategy, reasons: string[], cacheHit?: object }}
 */
function chooseRetrievalStrategy(query, documentMetadata = {}, conversationContext = []) {
  const reasons = [];
  const { collectionName, pageCount = 0 } = documentMetadata;

  // 1. Check CAG/cache first — fastest path
  const knowledgeType = classifyKnowledgeType(query, documentMetadata);

  if (knowledgeType === 'static' && collectionName) {
    const cached = getCachedStaticContext(collectionName, query);
    if (cached.hit) {
      reasons.push('Tài liệu tĩnh, cache hợp lệ');
      return { strategy: 'cag_cached', reasons, cacheHit: cached };
    }
  }

  // 2. Check if document is long/structured → hierarchical
  const useHierarchy = shouldUseHierarchy(documentMetadata);

  // 3. Determine dynamic vs static
  if (knowledgeType === 'dynamic') {
    reasons.push('Tài liệu động hoặc mới cập nhật');
    if (useHierarchy) {
      reasons.push(`Tài liệu dài (${pageCount} trang) → kết hợp phân cấp`);
      return { strategy: 'combined', reasons };
    }
    reasons.push('Sử dụng tìm kiếm hỗn hợp');
    return { strategy: 'hybrid_rag', reasons };
  }

  // 4. Static knowledge, no cache hit
  if (useHierarchy) {
    reasons.push(`Tài liệu tĩnh, dài (${pageCount} trang) → tìm kiếm phân cấp`);
    return { strategy: 'combined', reasons };
  }

  // 5. Standard hybrid RAG for normal static documents
  reasons.push('Tài liệu tĩnh, kích thước phù hợp → tìm kiếm hỗn hợp');
  return { strategy: 'hybrid_rag', reasons };
}

/**
 * Get human-readable description of a strategy.
 */
function describeStrategy(strategy) {
  const descriptions = {
    standard_rag: 'RAG tiêu chuẩn (vector)',
    hybrid_rag: 'RAG hỗn hợp (vector + từ khóa)',
    cag_cached: 'CAG / Bộ nhớ đệm kiến thức',
    hierarchical: 'Tìm kiếm phân cấp (PageIndex)',
    combined: 'Kết hợp (hỗn hợp + phân cấp)',
  };
  return descriptions[strategy] || strategy;
}

module.exports = { chooseRetrievalStrategy, describeStrategy };

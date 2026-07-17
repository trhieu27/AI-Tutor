/**
 * Knowledge Cache — CAG / Prompt Caching for static knowledge
 *
 * Caches reusable context for frequently asked questions about static documents.
 * Scoped by document/collection to avoid cross-contamination.
 * Invalidates when documents are updated or deleted.
 */

// In-memory cache with LRU-style eviction
const cache = new Map();
const MAX_CACHE_SIZE = 200;
const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes
const STATIC_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours for static content

/**
 * Classify whether knowledge for a query/document is static or dynamic.
 *
 * @param {string} query - User query
 * @param {object} documentMetadata - { updatedAt, pageCount, status, ... }
 * @returns {'static' | 'dynamic'}
 */
function classifyKnowledgeType(query, documentMetadata = {}) {
  const { updatedAt, status, uploadedAt } = documentMetadata;

  // Documents still processing are dynamic
  if (status && status !== 'READY') return 'dynamic';

  // Recently updated documents are dynamic
  if (updatedAt) {
    const updateAge = Date.now() - new Date(updatedAt).getTime();
    if (updateAge < 10 * 60 * 1000) return 'dynamic'; // Updated within 10 minutes
  }

  // Static: uploaded documents that haven't changed
  // Course materials, manuals, PDFs — these are inherently static once processed
  if (uploadedAt && status === 'READY') {
    const uploadAge = Date.now() - new Date(uploadedAt).getTime();
    if (uploadAge > 60 * 60 * 1000) return 'static'; // Older than 1 hour
  }

  // Queries referencing "latest", "recent", "new" suggest dynamic
  if (/\b(mới nhất|gần đây|cập nhật|hôm nay|latest|recent|today|updated)\b/i.test(query)) {
    return 'dynamic';
  }

  // Default: treat as static for stable documents
  return 'static';
}

/**
 * Build a cache key scoped to collection + query.
 */
function buildCacheKey(collectionName, query) {
  // Normalize query for cache matching
  const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();
  return `${collectionName}::${normalizedQuery}`;
}

/**
 * Get cached context for a static knowledge query.
 *
 * @param {string} collectionName
 * @param {string} query
 * @returns {{ hit: boolean, context?: object, age?: number }}
 */
function getCachedStaticContext(collectionName, query) {
  const key = buildCacheKey(collectionName, query);
  const entry = cache.get(key);

  if (!entry) return { hit: false };

  // Check TTL
  const age = Date.now() - entry.timestamp;
  if (age > entry.ttl) {
    cache.delete(key);
    return { hit: false };
  }

  // Move to end for LRU behavior
  cache.delete(key);
  cache.set(key, entry);

  return {
    hit: true,
    context: entry.context,
    age,
  };
}

/**
 * Store context in cache for future reuse.
 *
 * @param {string} collectionName
 * @param {string} query
 * @param {object} context - { selectedChunks, contextText, tokenEstimate, ... }
 * @param {object} [options] - { ttl, knowledgeType }
 */
function setCachedStaticContext(collectionName, query, context, options = {}) {
  const key = buildCacheKey(collectionName, query);
  const ttl = options.ttl || (options.knowledgeType === 'static' ? STATIC_TTL_MS : DEFAULT_TTL_MS);

  // Evict oldest entries if cache is full
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }

  cache.set(key, {
    context,
    timestamp: Date.now(),
    ttl,
    collectionName,
  });
}

/**
 * Invalidate all cached entries for a document/collection.
 * Should be called when documents are updated, re-indexed, or deleted.
 *
 * @param {string} collectionName
 */
function invalidateKnowledgeCache(collectionName) {
  let evicted = 0;
  for (const [key, entry] of cache.entries()) {
    if (entry.collectionName === collectionName) {
      cache.delete(key);
      evicted++;
    }
  }
  if (evicted > 0) {
    console.log(`[KnowledgeCache] Invalidated ${evicted} entries for ${collectionName}`);
  }
}

/**
 * Clear all cached entries.
 */
function clearAllCache() {
  cache.clear();
}

/**
 * Get cache statistics for debugging.
 */
function getCacheStats() {
  let staleCount = 0;
  const now = Date.now();
  for (const entry of cache.values()) {
    if (now - entry.timestamp > entry.ttl) staleCount++;
  }
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    staleEntries: staleCount,
  };
}

module.exports = {
  classifyKnowledgeType,
  getCachedStaticContext,
  setCachedStaticContext,
  invalidateKnowledgeCache,
  clearAllCache,
  getCacheStats,
};

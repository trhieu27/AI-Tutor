/**
 * vectorstore.js — ChromaDB v2 REST API client (direct fetch, no npm client quirks)
 *
 * Bypasses chromadb npm package entirely to avoid DefaultEmbeddingFunction issues.
 * Uses Node 18+ built-in fetch. ChromaDB server must be running on CHROMA_URL.
 */

const config = require('../config');

const BASE   = config.chromaUrl.replace(/\/$/, '');
const TENANT = 'default_tenant';
const DB     = 'default_database';
const API    = `${BASE}/api/v2/tenants/${TENANT}/databases/${DB}`;

async function chromaFetch(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${API}${path}`, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`ChromaDB ${method} ${path} → ${res.status}: ${text}`);
  }
  // 204 No Content — nothing to parse
  if (res.status === 204) return null;
  return res.json();
}

// ── Collection helpers ────────────────────────────────────────────────────────

/**
 * Get collection ID, creating it if it doesn't exist.
 * Returns collection ID string.
 */
async function getOrCreateCollectionId(name) {
  // Try to GET first
  try {
    const col = await chromaFetch('GET', `/collections/${encodeURIComponent(name)}`);
    return col.id;
  } catch (e) {
    if (!String(e.message).includes('404')) throw e;
  }
  // Not found — create
  const col = await chromaFetch('POST', '/collections', {
    name,
    metadata: { 'hnsw:space': 'cosine' },
    get_or_create: true,
  });
  return col.id;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Add chunks + embeddings to a collection.
 * ids: string[], embeddings: number[][], documents: string[]
 */
async function addDocuments(collectionName, ids, embeddings, documents, metadatas) {
  const id = await getOrCreateCollectionId(collectionName);
  const body = {
    ids,
    embeddings,
    documents,
  };
  if (Array.isArray(metadatas) && metadatas.length === documents.length) {
    body.metadatas = metadatas;
  }
  await chromaFetch('POST', `/collections/${id}/add`, body);
}

/**
 * Query top-k most similar chunks for a given embedding.
 * Returns string[] of document chunks.
 */
async function queryCollection(collectionName, queryEmbedding, nResults = 5) {
  try {
    const id  = await getOrCreateCollectionId(collectionName);
    const res = await chromaFetch('POST', `/collections/${id}/query`, {
      query_embeddings: [queryEmbedding],
      n_results: nResults,
      include: ['documents'],
    });
    return res.documents?.[0] || [];
  } catch (e) {
    console.error('queryCollection error:', e.message);
    return [];
  }
}

/**
 * Query top-k chunks with stored metadata.
 * Returns { text, metadata }[].
 */
async function queryCollectionWithMetadata(collectionName, queryEmbedding, nResults = 5) {
  try {
    const id  = await getOrCreateCollectionId(collectionName);
    const res = await chromaFetch('POST', `/collections/${id}/query`, {
      query_embeddings: [queryEmbedding],
      n_results: nResults,
      include: ['documents', 'metadatas'],
    });
    const documents = res.documents?.[0] || [];
    const metadatas = res.metadatas?.[0] || [];
    return documents.map((text, index) => ({
      text,
      metadata: metadatas[index] || {},
    }));
  } catch (e) {
    console.error('queryCollectionWithMetadata error:', e.message);
    return [];
  }
}

/**
 * Get all document chunks in a collection (for summarize / quiz / mindmap).
 * Returns string[].
 */
async function getAllDocuments(collectionName) {
  try {
    const id  = await getOrCreateCollectionId(collectionName);
    const res = await chromaFetch('POST', `/collections/${id}/get`, {
      include: ['documents'],
    });
    return res.documents || [];
  } catch (e) {
    console.error('getAllDocuments error:', e.message);
    return [];
  }
}

/**
 * Delete a collection entirely.
 */
async function deleteCollection(collectionName) {
  try {
    await chromaFetch('DELETE', `/collections/${encodeURIComponent(collectionName)}`);
  } catch (e) {
    // Ignore not-found errors
    if (!String(e.message).includes('404')) {
      console.warn('deleteCollection error (ignored):', e.message);
    }
  }
}

module.exports = { addDocuments, queryCollection, queryCollectionWithMetadata, getAllDocuments, deleteCollection };

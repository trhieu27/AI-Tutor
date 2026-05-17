/**
 * Hierarchy Builder — PageIndex / Vectorless RAG for structured documents
 *
 * Builds hierarchical document indices for long, structured documents.
 * Enables section-level navigation instead of just chunk similarity.
 */

const { generateText } = require('./gemini');
const vectorstore = require('./vectorstore');

// In-memory hierarchy store (per collection)
const hierarchies = new Map();

/**
 * Build a hierarchical representation of a document from its chunks.
 *
 * @param {string} collectionName
 * @param {Array<{text, metadata}>} chunks - All document chunks with metadata
 * @returns {Promise<object>} Document hierarchy tree
 */
async function buildDocumentHierarchy(collectionName, chunks) {
  if (!chunks || chunks.length === 0) return null;

  // Group chunks by page
  const pageGroups = new Map();
  for (const chunk of chunks) {
    const page = chunk.metadata?.page_number || 0;
    if (!pageGroups.has(page)) pageGroups.set(page, []);
    pageGroups.get(page).push(chunk);
  }

  // Build hierarchy from chunk content
  const hierarchy = {
    type: 'document',
    collectionName,
    totalChunks: chunks.length,
    totalPages: pageGroups.size,
    children: [],
    outline: null,
    builtAt: Date.now(),
  };

  // Create page-level nodes
  const sortedPages = [...pageGroups.keys()].sort((a, b) => a - b);
  for (const pageNum of sortedPages) {
    const pageChunks = pageGroups.get(pageNum);
    hierarchy.children.push({
      type: 'page',
      pageNumber: pageNum,
      chunkCount: pageChunks.length,
      chunks: pageChunks.map((c, i) => ({
        type: 'chunk',
        index: i,
        text: c.text,
        metadata: c.metadata,
        preview: c.text.slice(0, 150),
      })),
      preview: pageChunks[0]?.text.slice(0, 200) || '',
    });
  }

  // Generate outline via LLM (best effort)
  try {
    hierarchy.outline = await generateDocumentOutline(chunks);
  } catch (err) {
    console.warn('[HierarchyBuilder] Outline generation failed:', err.message);
  }

  // Cache the hierarchy
  hierarchies.set(collectionName, hierarchy);

  return hierarchy;
}

/**
 * Use LLM to generate a structured outline from document chunks.
 */
async function generateDocumentOutline(chunks) {
  // Use a representative sample of chunks to build outline
  const sampleSize = Math.min(chunks.length, 20);
  const step = Math.max(1, Math.floor(chunks.length / sampleSize));
  const sampleTexts = [];
  for (let i = 0; i < chunks.length && sampleTexts.length < sampleSize; i += step) {
    sampleTexts.push(chunks[i].text.slice(0, 300));
  }

  const prompt = `Phân tích nội dung tài liệu bên dưới và tạo dàn ý có cấu trúc.

NỘI DUNG (trích):
${sampleTexts.join('\n---\n')}

Trả về ĐÚNG JSON sau, không giải thích:
{
  "title": "Tiêu đề tài liệu",
  "sections": [
    {
      "title": "Tên phần",
      "pageStart": 1,
      "pageEnd": 5,
      "keywords": ["từ khóa 1", "từ khóa 2"],
      "subsections": [
        { "title": "Tên mục con", "pageStart": 1, "pageEnd": 2 }
      ]
    }
  ]
}

CHỈ trả về JSON:`;

  const result = await generateText(prompt, { temperature: 0.1, maxTokens: 2048 });

  const cleaned = result.trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;

  return JSON.parse(match[0]);
}

/**
 * Get or build hierarchy for a collection.
 *
 * @param {string} collectionName
 * @returns {Promise<object|null>}
 */
async function getDocumentHierarchy(collectionName) {
  // Check cache first
  const cached = hierarchies.get(collectionName);
  if (cached) return cached;

  // Build from stored chunks
  try {
    const allDocs = await vectorstore.getAllDocumentsWithMetadata(collectionName);
    if (!allDocs || allDocs.length === 0) return null;
    return buildDocumentHierarchy(collectionName, allDocs);
  } catch (err) {
    console.warn('[HierarchyBuilder] Failed to build hierarchy:', err.message);
    return null;
  }
}

/**
 * Retrieve relevant chunks by navigating the hierarchy.
 *
 * @param {string} query
 * @param {object} hierarchy - Document hierarchy tree
 * @param {object} [options] - { maxChunks }
 * @returns {Promise<Array<{text, metadata, score, method, hierarchyPath}>>}
 */
async function retrieveByHierarchy(query, hierarchy, options = {}) {
  const { maxChunks = 6 } = options;

  if (!hierarchy || !hierarchy.outline) {
    // No hierarchy available — return empty, let fallback handle it
    return [];
  }

  try {
    // Use LLM to identify relevant sections
    const relevantSections = await identifyRelevantSections(query, hierarchy.outline);

    // Collect chunks from relevant pages/sections
    const results = [];
    for (const section of relevantSections) {
      const pageStart = section.pageStart || 1;
      const pageEnd = section.pageEnd || pageStart;

      for (const pageNode of hierarchy.children) {
        if (pageNode.pageNumber >= pageStart && pageNode.pageNumber <= pageEnd) {
          for (const chunk of pageNode.chunks) {
            results.push({
              text: chunk.text,
              metadata: {
                ...chunk.metadata,
                section: section.title,
                hierarchyPath: `${hierarchy.outline?.title || 'Document'} > ${section.title}`,
              },
              score: section.relevance || 0.7,
              method: 'hierarchy',
              hierarchyPath: section.title,
            });
          }
        }
      }

      if (results.length >= maxChunks) break;
    }

    return results.slice(0, maxChunks);
  } catch (err) {
    console.warn('[HierarchyBuilder] Hierarchy retrieval failed:', err.message);
    return [];
  }
}

/**
 * Use LLM to identify which sections are relevant to the query.
 */
async function identifyRelevantSections(query, outline) {
  if (!outline?.sections?.length) return [];

  const sectionsText = outline.sections
    .map((s, i) => `[${i}] "${s.title}" (Trang ${s.pageStart}-${s.pageEnd})${s.keywords ? ` [${s.keywords.join(', ')}]` : ''}`)
    .join('\n');

  const prompt = `Cho câu hỏi và danh sách các phần của tài liệu, hãy chọn các phần có thể chứa câu trả lời.

CÂU HỎI: ${query}

CÁC PHẦN:
${sectionsText}

Trả về ĐÚNG JSON mảng chỉ số các phần liên quan, kèm mức độ liên quan (0-1), ví dụ:
[{"index": 0, "relevance": 0.9}, {"index": 2, "relevance": 0.6}]

Chọn tối đa 3 phần liên quan nhất. CHỈ trả về JSON:`;

  const result = await generateText(prompt, { temperature: 0.0, maxTokens: 256 });

  const cleaned = result.trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) return [];

  const parsed = JSON.parse(match[0]);
  return parsed
    .filter(item => item.index >= 0 && item.index < outline.sections.length)
    .map(item => ({
      ...outline.sections[item.index],
      relevance: item.relevance || 0.5,
    }))
    .sort((a, b) => b.relevance - a.relevance);
}

/**
 * Check if a document should use hierarchical retrieval.
 *
 * @param {object} documentMetadata - { pageCount, chunkCount }
 * @returns {boolean}
 */
function shouldUseHierarchy(documentMetadata) {
  const { pageCount = 0 } = documentMetadata;
  // Use hierarchy for documents with 10+ pages
  return pageCount >= 10;
}

/**
 * Invalidate cached hierarchy for a collection.
 */
function invalidateHierarchy(collectionName) {
  hierarchies.delete(collectionName);
}

/**
 * Format sources with hierarchy path for display.
 */
function formatHierarchicalSources(chunks) {
  return chunks.map((chunk, i) => ({
    title: chunk.metadata?.section || `Trích dẫn ${i + 1}`,
    text: chunk.text.slice(0, 320) + (chunk.text.length > 320 ? '...' : ''),
    page_number: chunk.metadata?.page_number,
    document_id: chunk.metadata?.document_id,
    section: chunk.metadata?.section,
    hierarchy_path: chunk.metadata?.hierarchyPath || chunk.hierarchyPath,
    relevance_score: chunk.rerankScore ?? chunk.score,
    retrieval_method: chunk.method,
  }));
}

module.exports = {
  buildDocumentHierarchy,
  generateDocumentOutline,
  getDocumentHierarchy,
  retrieveByHierarchy,
  shouldUseHierarchy,
  invalidateHierarchy,
  formatHierarchicalSources,
};

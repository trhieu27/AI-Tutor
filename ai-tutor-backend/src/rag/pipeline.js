/**
 * RAG Pipeline — Node.js implementation (Production-grade)
 *
 * Full retrieval pipeline:
 *   Query Rewriting → Retrieval Strategy Router → Hybrid Search / CAG / Hierarchy
 *   → Re-ranking → Context Selection → Grounded Answer Generation → Citations
 *
 * Provides: ingest, ask, summarize, quiz, mindmap, studyQuestions, deleteCollection
 */

const { v4: uuidv4 } = require('uuid');
const { extractText } = require('./extractor');
const { chunkText } = require('./chunker');
const { embedTexts, embedQuery, generateText, generateStream } = require('./gemini');
const vectorstore = require('./vectorstore');
const { rewriteQuery } = require('./query-rewriter');
const { hybridSearch } = require('./hybrid-search');
const { rerankResults } = require('./reranker');
const { selectContext } = require('./context-selector');
const { chooseRetrievalStrategy, describeStrategy } = require('./retrieval-router');
const { classifyKnowledgeType, getCachedStaticContext, setCachedStaticContext, invalidateKnowledgeCache } = require('./knowledge-cache');
const { getDocumentHierarchy, retrieveByHierarchy, formatHierarchicalSources, invalidateHierarchy } = require('./hierarchy-builder');

function throwIfAborted(signal) {
  if (!signal?.aborted) return;
  const err = new Error('Request aborted');
  err.name = 'AbortError';
  throw err;
}

// ── Ingest ────────────────────────────────────────────────────────────────────

/**
 * Process a document file:
 *   extract text → chunk → embed → store in ChromaDB
 *
 * @returns { collection_name: string, page_count: number }
 */
async function ingest(filePath, documentId) {
  const { text, pageCount, pages } = await extractText(filePath);

  if (!text || text.trim().length < 10) {
    throw new Error('Không thể đọc nội dung tài liệu. File có thể bị hỏng hoặc chỉ chứa ảnh.');
  }

  const chunkRecords = Array.isArray(pages) && pages.length > 0
    ? pages.flatMap(page =>
        chunkText(page.text || '').map(chunk => ({
          text: chunk,
          metadata: { page_number: page.page_number, document_id: documentId },
        }))
      )
    : chunkText(text).map(chunk => ({
        text: chunk,
        metadata: { document_id: documentId },
      }));
  const chunks = chunkRecords.map(record => record.text);
  if (chunks.length === 0) {
    throw new Error('Tài liệu không có nội dung văn bản.');
  }

  const embeddings = await embedTexts(chunks);
  const ids = chunks.map((_, i) => `${documentId}_chunk_${i}`);
  const collectionName = `doc_${documentId}`.replace(/-/g, '_');

  await vectorstore.addDocuments(collectionName, ids, embeddings, chunks, chunkRecords.map(record => record.metadata));

  // Invalidate any cached hierarchy/knowledge for this collection
  invalidateKnowledgeCache(collectionName);
  invalidateHierarchy(collectionName);

  return { collection_name: collectionName, page_count: pageCount };
}

// ── Ask (Production-grade pipeline) ───────────────────────────────────────────

/**
 * Production-grade RAG-based Q&A pipeline.
 *
 * Flow: Query Rewriting → Strategy Router → Search → Re-rank → Context Selection → Answer
 *
 * @param {string} collectionName
 * @param {string} question
 * @param {Array<{role:'human'|'ai', content:string}>} chatHistory
 * @param {object} [options] - { signal, documentMetadata, debug }
 * @returns {{ answer, sources, pipeline }}
 */
async function ask(collectionName, question, chatHistory = [], options = {}) {
  const { signal, documentMetadata = {}, debug = false } = options;
  const pipelineLog = {
    originalQuery: question,
    rewrittenQuery: null,
    strategy: null,
    strategyReasons: [],
    cacheHit: false,
    searchResultCount: 0,
    rerankedCount: 0,
    selectedCount: 0,
    tokenEstimate: 0,
    timings: {},
  };
  const startTime = Date.now();

  throwIfAborted(signal);

  // ── Early check: verify collection has data ──
  // Catches the case where ChromaDB data was lost (e.g. Docker volume reset)
  // while MongoDB still shows the document as READY
  const allDocs = await vectorstore.getAllDocuments(collectionName);
  if (!allDocs || allDocs.length === 0) {
    return {
      answer: 'Tài liệu này cần được xử lý lại. Dữ liệu tìm kiếm không còn trong hệ thống.\n\nVui lòng **xóa** tài liệu này trong thư viện và **tải lại** để tạo lại dữ liệu.',
      sources: [],
      pipeline: {
        strategy: 'none',
        strategyDescription: 'Không có dữ liệu',
        cacheHit: false,
        searchResultCount: 0,
        selectedCount: 0,
        totalTimeMs: Date.now() - startTime,
        error: 'empty_collection',
      },
    };
  }

  // ── Step 1: Query Rewriting ──
  const rewriteStart = Date.now();
  const rewrittenQuery = await rewriteQuery(question, chatHistory, { signal });
  pipelineLog.rewrittenQuery = rewrittenQuery;
  pipelineLog.timings.rewrite = Date.now() - rewriteStart;
  throwIfAborted(signal);

  // ── Step 2: Retrieval Strategy Router ──
  const docMeta = { ...documentMetadata, collectionName };
  const { strategy, reasons, cacheHit } = chooseRetrievalStrategy(rewrittenQuery, docMeta, chatHistory);
  pipelineLog.strategy = strategy;
  pipelineLog.strategyReasons = reasons;

  let retrievedChunks = [];

  // ── Step 3: Execute retrieval based on strategy ──
  const searchStart = Date.now();

  if (strategy === 'cag_cached' && cacheHit?.hit) {
    // CAG: Use cached context
    pipelineLog.cacheHit = true;
    const cachedContext = cacheHit.context;
    retrievedChunks = cachedContext.selectedChunks || [];
    pipelineLog.searchResultCount = retrievedChunks.length;

  } else if (strategy === 'combined') {
    // Combined: Hybrid search + Hierarchical retrieval
    const [hybridResults, hierarchyResults] = await Promise.all([
      hybridSearch(collectionName, rewrittenQuery, { nResults: 8, signal }),
      (async () => {
        const hierarchy = await getDocumentHierarchy(collectionName);
        if (!hierarchy) return [];
        return retrieveByHierarchy(rewrittenQuery, hierarchy, { maxChunks: 4 });
      })(),
    ]);
    throwIfAborted(signal);

    // Merge results, prioritizing hybrid but adding hierarchy context
    const seen = new Set();
    for (const chunk of [...hybridResults, ...hierarchyResults]) {
      const key = (chunk.text || '').slice(0, 200);
      if (!seen.has(key)) {
        seen.add(key);
        retrievedChunks.push(chunk);
      }
    }
    pipelineLog.searchResultCount = retrievedChunks.length;

  } else if (strategy === 'hierarchical') {
    // Pure hierarchical retrieval
    const hierarchy = await getDocumentHierarchy(collectionName);
    if (hierarchy) {
      retrievedChunks = await retrieveByHierarchy(rewrittenQuery, hierarchy, { maxChunks: 6 });
    }
    // Fallback to hybrid if hierarchy fails
    if (retrievedChunks.length === 0) {
      retrievedChunks = await hybridSearch(collectionName, rewrittenQuery, { nResults: 8, signal });
    }
    pipelineLog.searchResultCount = retrievedChunks.length;

  } else {
    // hybrid_rag or standard_rag: Hybrid search
    retrievedChunks = await hybridSearch(collectionName, rewrittenQuery, { nResults: 10, signal });
    pipelineLog.searchResultCount = retrievedChunks.length;
  }

  pipelineLog.timings.search = Date.now() - searchStart;
  throwIfAborted(signal);

  // ── Step 4: Re-ranking ──
  const rerankStart = Date.now();
  let rerankedChunks;
  if (strategy === 'cag_cached' && pipelineLog.cacheHit) {
    // Skip re-ranking for cached results
    rerankedChunks = retrievedChunks.map(c => ({ ...c, rerankScore: c.score }));
  } else {
    rerankedChunks = await rerankResults(rewrittenQuery, retrievedChunks, { maxChunks: 8, signal });
  }
  pipelineLog.rerankedCount = rerankedChunks.length;
  pipelineLog.timings.rerank = Date.now() - rerankStart;
  throwIfAborted(signal);

  // ── Step 5: Context Selection ──
  const selectStart = Date.now();
  const { selectedChunks, contextText, tokenEstimate } = selectContext(rerankedChunks, {
    maxTokens: 6000,
    minScore: 0.15,
    maxChunks: 5,
  });
  pipelineLog.selectedCount = selectedChunks.length;
  pipelineLog.tokenEstimate = tokenEstimate;
  pipelineLog.timings.select = Date.now() - selectStart;
  throwIfAborted(signal);

  // Cache context for future reuse (if static knowledge)
  if (!pipelineLog.cacheHit && selectedChunks.length > 0) {
    const knowledgeType = classifyKnowledgeType(question, docMeta);
    setCachedStaticContext(collectionName, rewrittenQuery, { selectedChunks, contextText, tokenEstimate }, { knowledgeType });
  }

  // ── Step 6: Grounded Answer Generation ──
  const generateStart = Date.now();

  // Format chat history
  const historyText = chatHistory
    .map(m => `${m.role === 'human' ? 'Học sinh' : 'Trợ lý'}: ${m.content}`)
    .join('\n');

  const prompt = `Bạn là trợ lý AI hỗ trợ học tập thông minh. Dựa trên nội dung tài liệu được cung cấp, hãy trả lời câu hỏi một cách chính xác, rõ ràng và có cấu trúc.

QUY TẮC QUAN TRỌNG:
- CHỈ trả lời dựa trên nội dung tài liệu được cung cấp bên dưới
- Nếu thông tin KHÔNG có trong tài liệu, hãy nói rõ: "Tài liệu không chứa đủ thông tin để trả lời câu hỏi này"
- KHÔNG bịa đặt hoặc thêm thông tin không có trong tài liệu
- Khi trích dẫn, ghi rõ trang nguồn, ví dụ: "(Trang 6)" hoặc "(Trang 1, Trang 8)". CHỈ dùng số trang có trong phần NỘI DUNG TÀI LIỆU bên dưới
- KHÔNG ĐƯỢC viết "Theo Nguồn 1", "Nguồn 5" hay bất kỳ số nguồn nào — chỉ dùng số trang
- Trả lời bằng tiếng Việt, rõ ràng và có cấu trúc

NỘI DUNG TÀI LIỆU:
${contextText || '(Không tìm thấy nội dung liên quan trong tài liệu)'}

${historyText ? `LỊCH SỬ CUỘC TRÒ CHUYỆN:\n${historyText}\n` : ''}CÂU HỎI GỐC: ${question}${rewrittenQuery !== question ? `\nCÂU HỎI ĐÃ PHÂN TÍCH: ${rewrittenQuery}` : ''}

Hãy trả lời:`;

  const { text: answer, toolExecuted } = await generateText(prompt, { temperature: 0.2, signal });
  pipelineLog.timings.generate = Date.now() - generateStart;
  pipelineLog.timings.total = Date.now() - startTime;
  throwIfAborted(signal);

  // ── Step 7: Format sources ──
  const sources = selectedChunks.map((chunk, index) => {
    const page = chunk.metadata?.page_number;
    const title = page ? `Trang ${page}` : chunk.metadata?.section || `Đoạn ${index + 1}`;
    return {
      title,
      text: chunk.text.slice(0, 320) + (chunk.text.length > 320 ? '...' : ''),
      page_number: page,
      document_id: chunk.metadata?.document_id,
      section: chunk.metadata?.section || null,
    };
  });

  const result = {
    answer,
    sources,
    toolExecuted,
  };

  // Include pipeline metadata for debug/advanced mode
  if (debug) {
    result.pipeline = {
      ...pipelineLog,
      strategyDescription: describeStrategy(strategy),
    };
  } else {
    // Minimal pipeline info: just strategy label + time for the chat badge
    result.pipeline = {
      strategy,
      strategyDescription: describeStrategy(strategy),
      totalTimeMs: pipelineLog.timings.total,
    };
  }

  return result;
}

// ── Summarize ─────────────────────────────────────────────────────────────────

/**
 * Stream a summary of the document.
 * Yields text chunks as an async generator.
 */
async function* summarize(collectionName) {
  const chunks = await vectorstore.getAllDocuments(collectionName);
  if (!chunks || chunks.length === 0) {
    yield 'Tài liệu này cần được xử lý lại. Vui lòng **xóa** tài liệu trong thư viện và **tải lại** để tạo lại dữ liệu.';
    return;
  }
  // Use first 30 chunks to stay within token limits
  const context = chunks.slice(0, 30).join('\n\n');

  const prompt = `Bạn là trợ lý AI hỗ trợ học tập. Hãy tạo bản tóm tắt toàn diện và có cấu trúc cho tài liệu học tập sau đây.

Bản tóm tắt cần:
- Bắt đầu bằng tổng quan ngắn gọn (2-3 câu)
- Trình bày các chủ đề và khái niệm chính theo thứ tự logic
- Sử dụng tiêu đề và gạch đầu dòng cho rõ ràng
- Viết bằng tiếng Việt, dễ hiểu cho học sinh/sinh viên

NỘI DUNG TÀI LIỆU:
${context}`;

  yield* generateStream(prompt, { temperature: 0.3, maxTokens: 4096 });
}

// ── Quiz ──────────────────────────────────────────────────────────────────────

/**
 * Stream a JSON quiz generated from the document.
 * Yields text chunks (full JSON string when assembled).
 */
async function* quiz(collectionName) {
  const chunks = await vectorstore.getAllDocuments(collectionName);
  if (!chunks || chunks.length === 0) {
    yield '[{"question":"Tài liệu cần được xử lý lại. Vui lòng xóa và tải lại tài liệu.","options":["---","---","---","---"],"correct_index":0,"explanation":"Dữ liệu vector đã bị mất."}]';
    return;
  }
  const context = chunks.slice(0, 40).join('\n\n');
  const chunkCount = chunks.length;
  const questionRange =
    chunkCount <= 4 ? '4-6' :
    chunkCount <= 10 ? '6-10' :
    chunkCount <= 20 ? '10-15' :
    chunkCount <= 35 ? '15-22' :
    '22-30';

  const prompt = `Bạn là chuyên gia tạo đề kiểm tra. Dựa vào nội dung tài liệu học tập bên dưới, hãy tạo số lượng câu hỏi trắc nghiệm (4 đáp án) phù hợp với độ dài và mật độ kiến thức của tài liệu.

Yêu cầu:
- Không cố định 10 câu. Với tài liệu này, hãy tạo khoảng ${questionRange} câu nếu nội dung đủ căn cứ
- Nếu tài liệu ngắn hoặc ít ý chính, tạo ít câu hơn thay vì lặp ý
- Nếu tài liệu dài và nhiều ý chính, tạo nhiều hơn 10 câu để bao phủ nội dung
- Câu hỏi đa dạng: kiến thức, hiểu biết, áp dụng
- Mỗi câu có đúng 1 đáp án đúng
- Giải thích ngắn gọn tại sao đáp án đó đúng
- Viết hoàn toàn bằng tiếng Việt

Trả về ĐÚNG định dạng JSON sau, không thêm text nào ngoài JSON:
[
  {
    "question": "Câu hỏi...",
    "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
    "correct_index": 0,
    "explanation": "Giải thích..."
  }
]

QUY TẮC:
- "options" là mảng 4 phần tử (chuỗi)
- "correct_index" là số nguyên 0-3 (vị trí đáp án đúng trong mảng options)

NỘI DUNG TÀI LIỆU:
${context}`;

  yield* generateStream(prompt, { temperature: 0.4, maxTokens: 8192 });
}

// ── Mindmap ───────────────────────────────────────────────────────────────────

/**
 * Stream a Mermaid mindmap diagram.
 * Yields text chunks.
 */
async function* mindmap(collectionName) {
  const chunks = await vectorstore.getAllDocuments(collectionName);
  if (!chunks || chunks.length === 0) {
    yield 'mindmap\n  root((Cần xử lý lại tài liệu))\n    Dữ liệu vector đã bị mất\n      Xóa và tải lại tài liệu';
    return;
  }
  const context = chunks.slice(0, 25).join('\n\n');

  const prompt = `Bạn là chuyên gia tổ chức kiến thức. Dựa vào nội dung tài liệu học tập bên dưới, hãy tạo sơ đồ tư duy (mindmap) bằng cú pháp Mermaid.

Yêu cầu sơ đồ:
- Chủ đề trung tâm là tiêu đề hoặc chủ đề chính của tài liệu
- Có ĐÚNG 6 nhánh chính (để đảm bảo cân bằng trái/phải: 3 nhánh bên phải, 3 nhánh bên trái)
- Mỗi nhánh chính PHẢI có 2-4 nhánh con (bắt buộc)
- Sắp xếp các nhánh chính xen kẽ: nhánh 1 → phải, nhánh 2 → trái, nhánh 3 → phải, ...
- Nhãn ngắn gọn, súc tích (tối đa 6 từ mỗi nhãn)
- Viết bằng tiếng Việt

Trả về ĐÚNG định dạng Mermaid mindmap, chỉ code thuần không thêm gì khác:

mindmap
  root((Chủ đề chính))
    Nhánh 1 (phải)
      Nhánh con 1.1
      Nhánh con 1.2
    Nhánh 2 (trái)
      Nhánh con 2.1
      Nhánh con 2.2
    Nhánh 3 (phải)
      Nhánh con 3.1
      Nhánh con 3.2
    Nhánh 4 (trái)
      Nhánh con 4.1
      Nhánh con 4.2
    Nhánh 5 (phải)
      Nhánh con 5.1
      Nhánh con 5.2
    Nhánh 6 (trái)
      Nhánh con 6.1
      Nhánh con 6.2

QUY TẮC BẮT BUỘC:
- Có ĐÚNG 6 nhánh chính để cân bằng trái/phải
- Mỗi nhánh chính PHẢI có ít nhất 2 nhánh con, KHÔNG được để nhánh chính không có con
- Dùng đúng 2 dấu cách (spaces) để thụt lề mỗi cấp (root=2, nhánh chính=4, nhánh con=6)
- Không dùng dấu ngoặc đơn (), ngoặc vuông [], hay ký tự đặc biệt trong tên nhánh
- Chỉ trả về code mindmap thuần, không có markdown fence, không có giải thích
- Tên nhánh trong ví dụ chỉ là mẫu, hãy thay bằng nội dung thực từ tài liệu

NỘI DUNG TÀI LIỆU:
${context}`;

  yield* generateStream(prompt, { temperature: 0.3, maxTokens: 4096 });
}

// ── Study Questions ───────────────────────────────────────────────────────────

/**
 * Stream a list of study questions.
 * Yields text chunks (one question per line when assembled).
 */
async function* studyQuestions(collectionName) {
  const chunks = await vectorstore.getAllDocuments(collectionName);
  if (!chunks || chunks.length === 0) {
    yield '1. Tài liệu cần được xử lý lại. Vui lòng xóa tài liệu trong thư viện và tải lại để tạo lại dữ liệu.';
    return;
  }
  const context = chunks.slice(0, 20).join('\n\n');

  const prompt = `Bạn là giáo viên có kinh nghiệm. Dựa vào nội dung tài liệu học tập bên dưới, hãy tạo 10 câu hỏi ôn tập tự luận giúp học sinh hiểu sâu kiến thức.

Yêu cầu:
- Câu hỏi kích thích tư duy, không chỉ ghi nhớ đơn thuần
- Đa dạng về mức độ: nhớ, hiểu, phân tích, đánh giá
- Ngắn gọn, rõ ràng
- Viết bằng tiếng Việt
- Mỗi câu hỏi trên một dòng riêng, bắt đầu bằng số thứ tự (1. 2. 3. ...)
- Chỉ trả về danh sách 10 câu hỏi, không chào hỏi, không mở đầu, không kết luận

NỘI DUNG TÀI LIỆU:
${context}`;

  yield* generateStream(prompt, { temperature: 0.4, maxTokens: 2048 });
}

// ── Ask Stream (SSE-friendly async generator) ────────────────────────────────

/**
 * Streaming version of ask(). Runs the same RAG pipeline (Steps 1–5)
 * then yields text chunks via generateStream() instead of generateText().
 *
 * Yields:
 *   { type: 'chunk', text: string }   – incremental text fragments
 *   { type: 'done', answer, sources, pipeline } – final metadata
 *
 * NOTE: Does NOT support browser tool (function calling) since that
 * requires non-streaming generateText.
 *
 * @param {string} collectionName
 * @param {string} question
 * @param {Array<{role:'human'|'ai', content:string}>} chatHistory
 * @param {object} [options] - { signal, documentMetadata, debug }
 */
async function* askStream(collectionName, question, chatHistory, options) {
  chatHistory = chatHistory || [];
  options = options || {};
  const signal = options.signal;
  const documentMetadata = options.documentMetadata || {};
  const debug = options.debug || false;

  const pipelineLog = {
    originalQuery: question,
    rewrittenQuery: null,
    strategy: null,
    strategyReasons: [],
    cacheHit: false,
    searchResultCount: 0,
    rerankedCount: 0,
    selectedCount: 0,
    tokenEstimate: 0,
    timings: {},
  };
  const startTime = Date.now();

  throwIfAborted(signal);

  // ── Early check: verify collection has data ──
  const allDocs = await vectorstore.getAllDocuments(collectionName);
  if (!allDocs || allDocs.length === 0) {
    yield {
      type: 'done',
      answer: 'T\u00e0i li\u1ec7u n\u00e0y c\u1ea7n \u0111\u01b0\u1ee3c x\u1eed l\u00fd l\u1ea1i. D\u1eef li\u1ec7u t\u00ecm ki\u1ebfm kh\u00f4ng c\u00f2n trong h\u1ec7 th\u1ed1ng.\n\nVui l\u00f2ng **x\u00f3a** t\u00e0i li\u1ec7u n\u00e0y trong th\u01b0 vi\u1ec7n v\u00e0 **t\u1ea3i l\u1ea1i** \u0111\u1ec3 t\u1ea1o l\u1ea1i d\u1eef li\u1ec7u.',
      sources: [],
      pipeline: {
        strategy: 'none',
        strategyDescription: 'Kh\u00f4ng c\u00f3 d\u1eef li\u1ec7u',
        cacheHit: false,
        searchResultCount: 0,
        selectedCount: 0,
        totalTimeMs: Date.now() - startTime,
        error: 'empty_collection',
      },
    };
    return;
  }

  // ── Step 1: Query Rewriting ──
  const rewriteStart = Date.now();
  const rewrittenQuery = await rewriteQuery(question, chatHistory, { signal });
  pipelineLog.rewrittenQuery = rewrittenQuery;
  pipelineLog.timings.rewrite = Date.now() - rewriteStart;
  throwIfAborted(signal);

  // ── Step 2: Retrieval Strategy Router ──
  const docMeta = Object.assign({}, documentMetadata, { collectionName: collectionName });
  const routerResult = chooseRetrievalStrategy(rewrittenQuery, docMeta, chatHistory);
  const strategy = routerResult.strategy;
  const reasons = routerResult.reasons;
  const cacheHit = routerResult.cacheHit;
  pipelineLog.strategy = strategy;
  pipelineLog.strategyReasons = reasons;

  let retrievedChunks = [];

  // ── Step 3: Execute retrieval based on strategy ──
  const searchStart = Date.now();

  if (strategy === 'cag_cached' && cacheHit && cacheHit.hit) {
    pipelineLog.cacheHit = true;
    const cachedContext = cacheHit.context;
    retrievedChunks = (cachedContext && cachedContext.selectedChunks) || [];
    pipelineLog.searchResultCount = retrievedChunks.length;

  } else if (strategy === 'combined') {
    const [hybridResults, hierarchyResults] = await Promise.all([
      hybridSearch(collectionName, rewrittenQuery, { nResults: 8, signal }),
      (async () => {
        const hierarchy = await getDocumentHierarchy(collectionName);
        if (!hierarchy) return [];
        return retrieveByHierarchy(rewrittenQuery, hierarchy, { maxChunks: 4 });
      })(),
    ]);
    throwIfAborted(signal);

    const seen = new Set();
    for (const chunk of [].concat(hybridResults, hierarchyResults)) {
      const key = ((chunk && chunk.text) || '').slice(0, 200);
      if (!seen.has(key)) {
        seen.add(key);
        retrievedChunks.push(chunk);
      }
    }
    pipelineLog.searchResultCount = retrievedChunks.length;

  } else if (strategy === 'hierarchical') {
    const hierarchy = await getDocumentHierarchy(collectionName);
    if (hierarchy) {
      retrievedChunks = await retrieveByHierarchy(rewrittenQuery, hierarchy, { maxChunks: 6 });
    }
    if (retrievedChunks.length === 0) {
      retrievedChunks = await hybridSearch(collectionName, rewrittenQuery, { nResults: 8, signal });
    }
    pipelineLog.searchResultCount = retrievedChunks.length;

  } else {
    retrievedChunks = await hybridSearch(collectionName, rewrittenQuery, { nResults: 10, signal });
    pipelineLog.searchResultCount = retrievedChunks.length;
  }

  pipelineLog.timings.search = Date.now() - searchStart;
  throwIfAborted(signal);

  // ── Step 4: Re-ranking ──
  const rerankStart = Date.now();
  let rerankedChunks;
  if (strategy === 'cag_cached' && pipelineLog.cacheHit) {
    rerankedChunks = retrievedChunks.map(function (c) { return Object.assign({}, c, { rerankScore: c.score }); });
  } else {
    rerankedChunks = await rerankResults(rewrittenQuery, retrievedChunks, { maxChunks: 8, signal });
  }
  pipelineLog.rerankedCount = rerankedChunks.length;
  pipelineLog.timings.rerank = Date.now() - rerankStart;
  throwIfAborted(signal);

  // ── Step 5: Context Selection ──
  const selectStart = Date.now();
  const selResult = selectContext(rerankedChunks, {
    maxTokens: 6000,
    minScore: 0.15,
    maxChunks: 5,
  });
  const selectedChunks = selResult.selectedChunks;
  const contextText = selResult.contextText;
  const tokenEstimate = selResult.tokenEstimate;
  pipelineLog.selectedCount = selectedChunks.length;
  pipelineLog.tokenEstimate = tokenEstimate;
  pipelineLog.timings.select = Date.now() - selectStart;
  throwIfAborted(signal);

  // Cache context for future reuse (if static knowledge)
  if (!pipelineLog.cacheHit && selectedChunks.length > 0) {
    const knowledgeType = classifyKnowledgeType(question, docMeta);
    setCachedStaticContext(collectionName, rewrittenQuery, { selectedChunks: selectedChunks, contextText: contextText, tokenEstimate: tokenEstimate }, { knowledgeType: knowledgeType });
  }

  // ── Step 6: Grounded Answer Generation (streaming) ──
  const generateStart = Date.now();

  const historyText = chatHistory
    .map(function (m) { return (m.role === 'human' ? 'H\u1ecdc sinh' : 'Tr\u1ee3 l\u00fd') + ': ' + m.content; })
    .join('\n');

  var prompt = 'B\u1ea1n l\u00e0 tr\u1ee3 l\u00fd AI h\u1ed7 tr\u1ee3 h\u1ecdc t\u1eadp th\u00f4ng minh. D\u1ef1a tr\u00ean n\u1ed9i dung t\u00e0i li\u1ec7u \u0111\u01b0\u1ee3c cung c\u1ea5p, h\u00e3y tr\u1ea3 l\u1eddi c\u00e2u h\u1ecfi m\u1ed9t c\u00e1ch ch\u00ednh x\u00e1c, r\u00f5 r\u00e0ng v\u00e0 c\u00f3 c\u1ea5u tr\u00fac.\n\n'
    + 'QUY T\u1eaeC QUAN TR\u1eccNG:\n'
    + '- CH\u1ec8 tr\u1ea3 l\u1eddi d\u1ef1a tr\u00ean n\u1ed9i dung t\u00e0i li\u1ec7u \u0111\u01b0\u1ee3c cung c\u1ea5p b\u00ean d\u01b0\u1edbi\n'
    + '- N\u1ebfu th\u00f4ng tin KH\u00d4NG c\u00f3 trong t\u00e0i li\u1ec7u, h\u00e3y n\u00f3i r\u00f5: "T\u00e0i li\u1ec7u kh\u00f4ng ch\u1ee9a \u0111\u1ee7 th\u00f4ng tin \u0111\u1ec3 tr\u1ea3 l\u1eddi c\u00e2u h\u1ecfi n\u00e0y"\n'
    + '- KH\u00d4NG b\u1ecba \u0111\u1eb7t ho\u1eb7c th\u00eam th\u00f4ng tin kh\u00f4ng c\u00f3 trong t\u00e0i li\u1ec7u\n'
    + '- Khi tr\u00edch d\u1eabn, ghi r\u00f5 trang ngu\u1ed3n, v\u00ed d\u1ee5: "(Trang 6)" ho\u1eb7c "(Trang 1, Trang 8)". CH\u1ec8 d\u00f9ng s\u1ed1 trang c\u00f3 trong ph\u1ea7n N\u1ed8I DUNG T\u00c0I LI\u1ec6U b\u00ean d\u01b0\u1edbi\n'
    + '- KH\u00d4NG \u0110\u01af\u1ee2C vi\u1ebft "Theo Ngu\u1ed3n 1", "Ngu\u1ed3n 5" hay b\u1ea5t k\u1ef3 s\u1ed1 ngu\u1ed3n n\u00e0o \u2014 ch\u1ec9 d\u00f9ng s\u1ed1 trang\n'
    + '- Tr\u1ea3 l\u1eddi b\u1eb1ng ti\u1ebfng Vi\u1ec7t, r\u00f5 r\u00e0ng v\u00e0 c\u00f3 c\u1ea5u tr\u00fac\n\n'
    + 'N\u1ed8I DUNG T\u00c0I LI\u1ec6U:\n'
    + (contextText || '(Kh\u00f4ng t\u00ecm th\u1ea5y n\u1ed9i dung li\u00ean quan trong t\u00e0i li\u1ec7u)')
    + '\n\n'
    + (historyText ? ('L\u1ecaCH S\u1eed CU\u1ed8C TR\u00d2 CHUY\u1ec6N:\n' + historyText + '\n') : '')
    + 'C\u00c2U H\u1eceI G\u1ed0C: ' + question
    + (rewrittenQuery !== question ? ('\nC\u00c2U H\u1eceI \u0110\u00c3 PH\u00c2N T\u00cdCH: ' + rewrittenQuery) : '')
    + '\n\nH\u00e3y tr\u1ea3 l\u1eddi:';

  let fullAnswer = '';
  for await (const chunk of generateStream(prompt, { temperature: 0.2, signal: signal })) {
    fullAnswer += chunk;
    yield { type: 'chunk', text: chunk };
  }
  pipelineLog.timings.generate = Date.now() - generateStart;
  pipelineLog.timings.total = Date.now() - startTime;

  // ── Step 7: Format sources ──
  const sources = selectedChunks.map(function (chunk, index) {
    var meta = chunk.metadata || {};
    var page = meta.page_number;
    var title = page ? ('Trang ' + page) : (meta.section || ('\u0110o\u1ea1n ' + (index + 1)));
    return {
      title: title,
      text: chunk.text.slice(0, 320) + (chunk.text.length > 320 ? '...' : ''),
      page_number: page,
      document_id: meta.document_id,
      section: meta.section || null,
    };
  });

  var pipeline;
  if (debug) {
    pipeline = Object.assign({}, pipelineLog, {
      strategyDescription: describeStrategy(strategy),
    });
  } else {
    pipeline = {
      strategy: strategy,
      strategyDescription: describeStrategy(strategy),
      totalTimeMs: pipelineLog.timings.total,
    };
  }

  yield { type: 'done', answer: fullAnswer, sources: sources, pipeline: pipeline };
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function deleteDocumentCollection(collectionName) {
  await vectorstore.deleteCollection(collectionName);
  invalidateKnowledgeCache(collectionName);
  invalidateHierarchy(collectionName);
}

module.exports = { ingest, ask, askStream, summarize, quiz, mindmap, studyQuestions, deleteDocumentCollection };

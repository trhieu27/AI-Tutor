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
const path = require('path');
const { extractText, detectImagePages, extractDocxImages } = require('./extractor');
const { chunkText } = require('./chunker');
const { embedTexts, embedQuery, generateText, generateStream, chatStream, describeDocumentImages, describeDocxImages } = require('./gemini');
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
async function ingest(filePath, documentId, options = {}) {
  const { signal } = options;
  const ext = path.extname(filePath).toLowerCase();
  const buffer = require('fs').readFileSync(filePath);
  throwIfAborted(signal);

  const { text, pageCount, pages } = await extractText(filePath);
  throwIfAborted(signal);

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

  // ── Vision: mô tả hình ảnh/biểu đồ trong tài liệu ──
  try {
    throwIfAborted(signal);
    if (ext === '.pdf') {
      const imagePages = await detectImagePages(buffer);
      if (imagePages.length > 0) {
        console.log(`[Ingest] Phát hiện ${imagePages.length} trang có hình: ${imagePages.join(', ')}`);
        throwIfAborted(signal);
        const descriptions = await describeDocumentImages(buffer, pageCount, imagePages);
        for (const desc of descriptions) {
          chunkRecords.push({
            text: `[Hình ảnh/Biểu đồ Trang ${desc.page_number}]\n${desc.description}`,
            metadata: {
              page_number: desc.page_number,
              document_id: documentId,
              content_type: 'image_description',
            },
          });
        }
        console.log(`[Ingest] Đã mô tả ${descriptions.length} trang hình ảnh`);
      }
    } else if (ext === '.docx' || ext === '.doc') {
      const images = await extractDocxImages(buffer);
      if (images.length > 0) {
        console.log(`[Ingest] Phát hiện ${images.length} hình trong DOCX`);
        throwIfAborted(signal);
        const descriptions = await describeDocxImages(images);
        for (const desc of descriptions) {
          chunkRecords.push({
            text: `[Hình ảnh ${desc.index}]\n${desc.description}`,
            metadata: {
              document_id: documentId,
              content_type: 'image_description',
              image_index: desc.index,
            },
          });
        }
        console.log(`[Ingest] Đã mô tả ${descriptions.length} hình DOCX`);
      }
    }
  } catch (visionErr) {
    if (visionErr.name === 'AbortError') throw visionErr;
    console.warn('[Ingest] Vision processing failed (non-blocking):', visionErr.message);
    // Vision lỗi không chặn ingest — text vẫn được lưu bình thường
  }

  const chunks = chunkRecords.map(record => record.text);
  if (chunks.length === 0) {
    throw new Error('Tài liệu không có nội dung văn bản.');
  }

  throwIfAborted(signal);
  const embeddings = await embedTexts(chunks);
  throwIfAborted(signal);

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
 * @param {Array<{role:'human'|'ai', content:string}>} conversationHistory
 * @param {object} [options] - { signal, documentMetadata, debug }
 * @returns {{ answer, sources, pipeline }}
 */
async function ask(collectionName, question, conversationHistory = [], options = {}) {
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
  const rewrittenQuery = await rewriteQuery(question, conversationHistory, { signal });
  pipelineLog.rewrittenQuery = rewrittenQuery;
  pipelineLog.timings.rewrite = Date.now() - rewriteStart;
  throwIfAborted(signal);

  // ── Step 2: Retrieval Strategy Router ──
  const docMeta = { ...documentMetadata, collectionName };
  const { strategy, reasons, cacheHit } = chooseRetrievalStrategy(rewrittenQuery, docMeta, conversationHistory);
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

  // Format conversation history for prompt
  const historyText = conversationHistory
    .map(m => `${m.role === 'human' ? 'Học sinh' : 'Trợ lý'}: ${m.content}`)
    .join('\n');

  const prompt = `Bạn là trợ lý AI chuyên hỗ trợ học tập cho sinh viên Việt Nam. Nhiệm vụ: trả lời câu hỏi DỰA HOÀN TOÀN vào nội dung tài liệu được cung cấp.

VAI TRÒ:
- Bạn là gia sư kiên nhẫn, giải thích dễ hiểu, đưa ví dụ minh họa khi cần
- Ưu tiên trả lời có cấu trúc: tiêu đề, bullet points, bảng so sánh nếu phù hợp
- Dùng markdown formatting (bold, italic, heading) để trả lời rõ ràng hơn

QUY TẮC BẮT BUỘC:
- CHỈ dùng thông tin từ phần NỘI DUNG TÀI LIỆU bên dưới
- Nếu tài liệu không chứa câu trả lời → nói thẳng: "Tài liệu không đề cập đến nội dung này"
- TUYỆT ĐỐI KHÔNG bịa đặt, không thêm kiến thức ngoài tài liệu
- Trích dẫn trang nguồn: "(Trang 6)" hoặc "(Trang 1, 8)". CHỈ dùng số trang xuất hiện trong NỘI DUNG TÀI LIỆU
- KHÔNG viết "Theo Nguồn 1", "Nguồn 5" — chỉ dùng số trang
- Nếu nội dung bao gồm mô tả hình ảnh/biểu đồ (đánh dấu [Đồ họa trang X]), hãy sử dụng thông tin đó để trả lời
- Trả lời bằng tiếng Việt, rõ ràng và có cấu trúc
- KHÔNG dùng cú pháp LaTeX ($...$, \\hat, \\beta, \\frac...). Thay bằng ký tự Unicode: Ŷ, β₀, β₁, x̄, Σ, √, ², ³, ≥, ≤, ≠, →, ×, ÷ hoặc viết dạng text (ví dụ: "Y mũ", "beta 0")

NỘI DUNG TÀI LIỆU:
${contextText || '(Không tìm thấy nội dung liên quan trong tài liệu)'}

${historyText ? `LỊCH SỬ CUỘC TRÒ CHUYỆN:\n${historyText}\n` : ''}CÂU HỎI GỐC: ${question}${rewrittenQuery !== question ? `\nCÂU HỎI ĐÃ PHÂN TÍCH: ${rewrittenQuery}` : ''}

Hãy trả lời:`;

  const answer = await generateText(prompt, { temperature: 0.2, maxTokens: 4096, signal });
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

  const prompt = `Bạn là giảng viên đại học có kinh nghiệm. Hãy tạo bản tóm tắt chuyên sâu cho tài liệu học tập sau.

CẤU TRÚC BẢN TÓM TẮT:
1. **Tổng quan** (2-3 câu): Chủ đề chính, mục tiêu học tập
2. **Các phần chính**: Trình bày theo thứ tự logic của tài liệu
   - Dùng tiêu đề ## cho mỗi phần lớn
   - Giải thích khái niệm quan trọng bằng ngôn ngữ dễ hiểu
   - Đánh dấu **thuật ngữ chuyên ngành** bằng bold
3. **Mối liên hệ**: Chỉ ra cách các phần liên kết với nhau
4. **Điểm cần nhớ**: Bullet points tóm gọn kiến thức cốt lõi

YÊU CẦU:
- Viết bằng tiếng Việt, rõ ràng cho sinh viên
- KHÔNG dùng LaTeX ($...$). Dùng Unicode: α, β, Ŷ, β₀, Σ, √, ², ≥, ≤, → hoặc text
- Dùng markdown formatting (heading, bold, bullet, bảng nếu cần)
- Nếu tài liệu có hình ảnh/biểu đồ được mô tả, hãy đề cập
- Không bỏ sót ý chính nào trong tài liệu

NỘI DUNG TÀI LIỆU:
${context}`;

  yield* generateStream(prompt, { temperature: 0.3, maxTokens: 4096, modelTier: 'lite' });
}

// ── Quiz ──────────────────────────────────────────────────────────────────────

/**
 * Stream a JSON quiz generated from the document.
 * Yields text chunks (full JSON string when assembled).
 */
async function* quiz(collectionName) {
  const chunks = await vectorstore.getAllDocuments(collectionName);
  if (!chunks || chunks.length === 0) {
    yield '[{"question":"Tài liệu cần được xử lý lại. Vui lòng xóa và tải lại tài liệu.","options":["---","---","---","---"],"correct_indices":[0],"explanation":"Dữ liệu vector đã bị mất."}]';
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

  const prompt = `Bạn là chuyên gia kiểm tra đánh giá giáo dục. Dựa vào tài liệu học tập bên dưới, hãy tạo đề trắc nghiệm chất lượng cao.

NGUYÊN TẮC RA ĐỀ:
- Không cố định 10 câu. Với tài liệu này, hãy tạo khoảng ${questionRange} câu nếu nội dung đủ căn cứ
- Nếu tài liệu ngắn hoặc ít ý chính, tạo ít câu hơn thay vì lặp ý
- Nếu tài liệu dài và nhiều ý chính, tạo nhiều hơn 10 câu để bao phủ nội dung
- Phân bổ theo thang Bloom: 30% Ghi nhớ, 30% Hiểu, 25% Áp dụng, 15% Phân tích
- Khoảng 80% câu hỏi có ĐÚNG 1 đáp án đúng (single-select)
- Khoảng 20% câu hỏi có NHIỀU đáp án đúng (multi-select), ghi rõ trong đề "Chọn tất cả đáp án đúng"
- Đáp án nhiễu phải hợp lý (không quá dễ loại), nên là lỗi phổ biến sinh viên hay mắc
- Giải thích rõ: tại sao đáp án đúng, và tại sao các đáp án khác sai (1-2 câu)
- Viết hoàn toàn bằng tiếng Việt, rõ ràng
- KHÔNG dùng cú pháp LaTeX ($...$, \\\\hat, \\\\alpha, \\\\beta, \\\\frac...). Dùng ký tự Unicode: α, β, Ŷ, β₀, β₁, x̄, Σ, √, ², ≥, ≤, ≠, → hoặc viết text (ví dụ: "alpha", "beta")

XÁO TRỘN VỊ TRÍ ĐÁP ÁN (BẮT BUỘC):
- KHÔNG được luôn đặt đáp án đúng ở vị trí A (index 0)
- Phân bổ đáp án đúng đều giữa các vị trí A, B, C, D (mỗi vị trí khoảng 25%)
- Với mỗi câu, hãy xáo trộn ngẫu nhiên thứ tự các phương án trước khi gán correct_indices
- Nếu thấy nhiều câu liên tiếp có cùng vị trí đáp án đúng, hãy thay đổi

Trả về ĐÚNG định dạng JSON sau, không thêm text nào ngoài JSON:
[
  {
    "question": "Câu hỏi chọn 1 đáp án...",
    "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
    "correct_indices": [2],
    "explanation": "Giải thích..."
  },
  {
    "question": "(Chọn tất cả đáp án đúng) Câu hỏi nhiều đáp án...",
    "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
    "correct_indices": [1, 3],
    "explanation": "Giải thích..."
  }
]

QUY TẮC:
- "options" là mảng 4 phần tử (chuỗi)
- "correct_indices" là MẢNG số nguyên (ví dụ: [2] cho 1 đáp án, [0, 3] cho nhiều đáp án)
- KHÔNG luôn dùng [0] làm đáp án đúng — xáo trộn đều giữa 0, 1, 2, 3
- Câu multi-select: bắt đầu question bằng "(Chọn tất cả đáp án đúng)"
- QUAN TRỌNG: PHẢI trả về JSON hoàn chỉnh, đóng đủ dấu ] ở cuối. Không được cắt giữa chừng

NỘI DUNG TÀI LIỆU:
${context}`;

  yield* generateStream(prompt, { temperature: 0.4, maxTokens: 8192, modelTier: 'lite' });
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
  const context = chunks.slice(0, 40).join('\n\n');

  const prompt = `Bạn là chuyên gia tổ chức kiến thức và trực quan hóa thông tin. Dựa vào tài liệu học tập bên dưới, hãy tạo sơ đồ tư duy (mindmap) bằng cú pháp Mermaid. Sơ đồ phải bao quát TOÀN BỘ nội dung chính của tài liệu.

Yêu cầu sơ đồ:
- Chủ đề trung tâm là tiêu đề hoặc chủ đề chính của tài liệu
- Số nhánh chính KHÔNG giới hạn, tạo đủ nhánh để bao quát hết nội dung tài liệu
- Mỗi nhánh chính PHẢI có 2-5 nhánh con
- Nhánh con quan trọng CÓ THỂ có 1-3 nhánh con cấp 3 (tổng cộng tối đa 4 cấp depth)
- Nhãn ngắn gọn, súc tích (tối đa 6 từ mỗi nhãn)
- Bao quát đầy đủ các khái niệm, định nghĩa, quy trình, ví dụ trong tài liệu
- Viết bằng tiếng Việt
- KHÔNG dùng LaTeX. Dùng Unicode: α, β, Σ, √, ² hoặc text

Trả về ĐÚNG định dạng Mermaid mindmap, chỉ code thuần không thêm gì khác:

mindmap
  root((Chủ đề chính))
    Nhánh chính 1
      Nhánh con 1.1
        Chi tiết 1.1.1
        Chi tiết 1.1.2
      Nhánh con 1.2
      Nhánh con 1.3
    Nhánh chính 2
      Nhánh con 2.1
      Nhánh con 2.2
        Chi tiết 2.2.1
      Nhánh con 2.3
    Nhánh chính 3
      Nhánh con 3.1
      Nhánh con 3.2
    Nhánh chính 4
      Nhánh con 4.1
      Nhánh con 4.2
      Nhánh con 4.3

QUY TẮC BẮT BUỘC:
- Số nhánh chính KHÔNG giới hạn, phụ thuộc hoàn toàn vào nội dung tài liệu
- Mỗi nhánh chính PHẢI có ít nhất 2 nhánh con, KHÔNG được để nhánh chính trống
- Nhánh con quan trọng nên có thêm nhánh cấp 3 để đi sâu vào chi tiết
- Dùng đúng 2 dấu cách (spaces) để thụt lề mỗi cấp (root=2, nhánh chính=4, nhánh con=6, cấp 3=8)
- Không dùng dấu ngoặc đơn (), ngoặc vuông [], hay ký tự đặc biệt trong tên nhánh
- Chỉ trả về code mindmap thuần, không có markdown fence, không có giải thích
- Tên nhánh trong ví dụ chỉ là mẫu, hãy thay bằng nội dung thực từ tài liệu
- MỤC TIÊU: bao quát TẤT CẢ nội dung quan trọng, không bỏ sót chủ đề nào

NỘI DUNG TÀI LIỆU:
${context}`;

  yield* generateStream(prompt, { temperature: 0.3, maxTokens: 8192, modelTier: 'lite' });
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

  const prompt = `Bạn là giảng viên đại học dày dạn kinh nghiệm. Dựa vào tài liệu bên dưới, hãy tạo 10 câu hỏi ôn tập tự luận chất lượng cao.

YÊU CẦU:
- Phân bổ theo thang Bloom:
  + 2 câu Ghi nhớ (định nghĩa, liệt kê)
  + 3 câu Hiểu (giải thích, so sánh)
  + 3 câu Áp dụng/Phân tích (tình huống, ví dụ)
  + 2 câu Đánh giá/Sáng tạo (nhận xét, đề xuất)
- Câu hỏi rõ ràng, cụ thể, có thể trả lời được từ tài liệu
- Viết bằng tiếng Việt
- KHÔNG dùng LaTeX ($...$). Dùng Unicode: α, β, Ŷ, β₀, Σ, √, ², ≥, ≤, → hoặc text
- Định dạng: mỗi câu một dòng, bắt đầu bằng số (1. 2. 3. ...)
- CHỈ trả về 10 câu hỏi, không mở đầu, không kết luận

NỘI DUNG TÀI LIỆU:
${context}`;

  yield* generateStream(prompt, { temperature: 0.4, maxTokens: 2048, modelTier: 'lite' });
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
 * @param {Array<{role:'human'|'ai', content:string}>} conversationHistory
 * @param {object} [options] - { signal, documentMetadata, debug }
 */
async function* askStream(collectionName, question, conversationHistory, options) {
  conversationHistory = conversationHistory || [];
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
    return;
  }

  // ── Step 1: Query Rewriting ──
  yield { type: 'status', step: 'analyzing' };
  const rewriteStart = Date.now();
  const rewrittenQuery = await rewriteQuery(question, conversationHistory, { signal });
  pipelineLog.rewrittenQuery = rewrittenQuery;
  pipelineLog.timings.rewrite = Date.now() - rewriteStart;
  throwIfAborted(signal);

  // ── Step 2: Retrieval Strategy Router ──
  const docMeta = Object.assign({}, documentMetadata, { collectionName: collectionName });
  const routerResult = chooseRetrievalStrategy(rewrittenQuery, docMeta, conversationHistory);
  const strategy = routerResult.strategy;
  const reasons = routerResult.reasons;
  const cacheHit = routerResult.cacheHit;
  pipelineLog.strategy = strategy;
  pipelineLog.strategyReasons = reasons;

  let retrievedChunks = [];

  // ── Step 3: Execute retrieval based on strategy ──
  yield { type: 'status', step: 'searching' };
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
  yield { type: 'status', step: 'reranking' };
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

  // ── Step 6: Grounded Answer Generation (multi-turn streaming) ──
  yield { type: 'status', step: 'generating' };
  const generateStart = Date.now();

  // System instruction — separated and cached by Gemini (like ChatGPT/Claude)
  const systemInstruction = 'Bạn là trợ lý AI hỗ trợ học tập thông minh. Dựa trên nội dung tài liệu được cung cấp, hãy trả lời câu hỏi một cách chính xác, rõ ràng và có cấu trúc.\n\n'
    + 'QUY TẮC QUAN TRỌNG:\n'
    + '- CHỈ trả lời dựa trên nội dung tài liệu được cung cấp bên dưới\n'
    + '- Nếu thông tin KHÔNG có trong tài liệu, hãy nói rõ: "Tài liệu không chứa đủ thông tin để trả lời câu hỏi này"\n'
    + '- KHÔNG bịa đặt hoặc thêm thông tin không có trong tài liệu\n'
    + '- Khi trích dẫn, ghi rõ trang nguồn, ví dụ: "(Trang 6)" hoặc "(Trang 1, Trang 8)". CHỈ dùng số trang có trong phần NỘI DUNG TÀI LIỆU\n'
    + '- KHÔNG ĐƯỢC viết "Theo Nguồn 1", "Nguồn 5" hay bất kỳ số nguồn nào — chỉ dùng số trang\n'
    + '- Trả lời bằng tiếng Việt, rõ ràng và có cấu trúc\n'
    + '- KHÔNG dùng cú pháp LaTeX ($...$, \\hat, \\beta, \\frac...). Thay bằng ký tự Unicode: Ŷ, β₀, β₁, x̄, Σ, √, ², ³, ≥, ≤, ≠, →, ×, ÷ hoặc viết dạng text (ví dụ: "Y mũ", "beta 0")';

  // Convert conversation history → Gemini multi-turn format
  const geminiTurns = conversationHistory.flatMap(function (m) {
    return [{
      role: m.role === 'human' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }];
  });

  // User message = RAG context + current question (context only for this turn)
  var userMessage = 'NỘI DUNG TÀI LIỆU:\n'
    + (contextText || '(Không tìm thấy nội dung liên quan trong tài liệu)')
    + '\n\nCÂU HỎI: ' + question
    + (rewrittenQuery !== question ? ('\nCÂU HỎI ĐÃ PHÂN TÍCH: ' + rewrittenQuery) : '')
    + '\n\nHãy trả lời:';

  let fullAnswer = '';
  for await (const chunk of chatStream(systemInstruction, geminiTurns, userMessage, {
    temperature: 0.2, maxTokens: 8192, signal: signal, thinkingBudget: 2048,
  })) {
    fullAnswer += chunk;
    yield { type: 'chunk', text: chunk };
  }
  pipelineLog.timings.generate = Date.now() - generateStart;
  pipelineLog.timings.total = Date.now() - startTime;

  // ── Step 7: Format sources ──
  const sources = selectedChunks.map(function (chunk, index) {
    var meta = chunk.metadata || {};
    var page = meta.page_number;
    var title = page ? ('Trang ' + page) : (meta.section || ('Đoạn ' + (index + 1)));
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

  // Không yield done nếu request đã bị hủy → chat.js sẽ không lưu DB
  throwIfAborted(signal);

  yield { type: 'done', answer: fullAnswer, sources: sources, pipeline: pipeline };
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function deleteDocumentCollection(collectionName) {
  await vectorstore.deleteCollection(collectionName);
  invalidateKnowledgeCache(collectionName);
  invalidateHierarchy(collectionName);
}

module.exports = { ingest, ask, askStream, summarize, quiz, mindmap, studyQuestions, deleteDocumentCollection };

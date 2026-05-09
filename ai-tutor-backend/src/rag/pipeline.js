/**
 * RAG Pipeline — Node.js implementation
 *
 * Replaces the Python FastAPI RAG service.
 * Provides: ingest, ask, summarize, quiz, mindmap, studyQuestions, deleteCollection
 */

const { v4: uuidv4 } = require('uuid');
const { extractText } = require('./extractor');
const { chunkText } = require('./chunker');
const { embedTexts, embedQuery, generateText, generateStream } = require('./gemini');
const vectorstore = require('./vectorstore');

// ── Ingest ────────────────────────────────────────────────────────────────────

/**
 * Process a document file:
 *   extract text → chunk → embed → store in ChromaDB
 *
 * @returns { collection_name: string, page_count: number }
 */
async function ingest(filePath, documentId) {
  const { text, pageCount } = await extractText(filePath);

  if (!text || text.trim().length < 10) {
    throw new Error('Không thể đọc nội dung tài liệu. File có thể bị hỏng hoặc chỉ chứa ảnh.');
  }

  const chunks = chunkText(text);
  if (chunks.length === 0) {
    throw new Error('Tài liệu không có nội dung văn bản.');
  }

  const embeddings = await embedTexts(chunks);
  const ids = chunks.map((_, i) => `${documentId}_chunk_${i}`);
  const collectionName = `doc_${documentId}`.replace(/-/g, '_');

  await vectorstore.addDocuments(collectionName, ids, embeddings, chunks);

  return { collection_name: collectionName, page_count: pageCount };
}

// ── Ask ───────────────────────────────────────────────────────────────────────

/**
 * RAG-based Q&A.
 *
 * @param {string} collectionName
 * @param {string} question
 * @param {Array<{role:'human'|'ai', content:string}>} chatHistory
 * @returns {{ answer: string, sources: string[] }}
 */
async function ask(collectionName, question, chatHistory = []) {
  // Retrieve relevant context
  const queryVec = await embedQuery(question);
  const chunks = await vectorstore.queryCollection(collectionName, queryVec, 6);

  const context = chunks.join('\n\n---\n\n');

  // Format chat history
  const historyText = chatHistory
    .map(m => `${m.role === 'human' ? 'Học sinh' : 'Trợ lý'}: ${m.content}`)
    .join('\n');

  const prompt = `Bạn là trợ lý AI hỗ trợ học tập thông minh. Dựa trên nội dung tài liệu được cung cấp, hãy trả lời câu hỏi một cách chính xác, rõ ràng và có cấu trúc.

NỘI DUNG TÀI LIỆU:
${context}

${historyText ? `LỊCH SỬ CUỘC TRÒ CHUYỆN:\n${historyText}\n` : ''}
CÂU HỎI: ${question}

Hãy trả lời dựa trên nội dung tài liệu. Nếu câu hỏi không liên quan đến tài liệu hoặc thông tin không có trong tài liệu, hãy nói rõ điều đó một cách lịch sự.`;

  const answer = await generateText(prompt, { temperature: 0.2 });

  return {
    answer,
    sources: chunks.slice(0, 3).map(c => c.slice(0, 200) + (c.length > 200 ? '...' : '')),
  };
}

// ── Summarize ─────────────────────────────────────────────────────────────────

/**
 * Stream a summary of the document.
 * Yields text chunks as an async generator.
 */
async function* summarize(collectionName) {
  const chunks = await vectorstore.getAllDocuments(collectionName);
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
  const context = chunks.slice(0, 25).join('\n\n');

  const prompt = `Bạn là chuyên gia tạo đề kiểm tra. Dựa vào nội dung tài liệu học tập bên dưới, hãy tạo 10 câu hỏi trắc nghiệm (4 đáp án) để kiểm tra kiến thức.

Yêu cầu:
- Câu hỏi đa dạng: kiến thức, hiểu biết, áp dụng
- Mỗi câu có đúng 1 đáp án đúng
- Giải thích ngắn gọn tại sao đáp án đó đúng
- Viết hoàn toàn bằng tiếng Việt

Trả về ĐÚNH định dạng JSON sau, không thêm text nào ngoài JSON:
[
  {
    "question": "Câu hỏi...",
    "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
    "correct_index": 0,
    "explanation": "Giải thích..."
  }
]

QUY TẮc:
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
  const context = chunks.slice(0, 20).join('\n\n');

  const prompt = `Bạn là giáo viên có kinh nghiệm. Dựa vào nội dung tài liệu học tập bên dưới, hãy tạo 10 câu hỏi ôn tập tự luận giúp học sinh hiểu sâu kiến thức.

Yêu cầu:
- Câu hỏi kích thích tư duy, không chỉ ghi nhớ đơn thuần
- Đa dạng về mức độ: nhớ, hiểu, phân tích, đánh giá
- Ngắn gọn, rõ ràng
- Viết bằng tiếng Việt
- Mỗi câu hỏi trên một dòng riêng, bắt đầu bằng số thứ tự (1. 2. 3. ...)

NỘI DUNG TÀI LIỆU:
${context}`;

  yield* generateStream(prompt, { temperature: 0.4, maxTokens: 2048 });
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function deleteDocumentCollection(collectionName) {
  await vectorstore.deleteCollection(collectionName);
}

module.exports = { ingest, ask, summarize, quiz, mindmap, studyQuestions, deleteDocumentCollection };

const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

// text-embedding-004 requires v1beta (passed as 2nd arg to getGenerativeModel)
// Using gemini-embedding-001 = same model as old Python service (GoogleGenerativeAIEmbeddings)
const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const EMBED_MODEL = 'models/gemini-embedding-001';
const CHAT_MODEL = 'gemini-flash-latest'; // Python cũ dùng gemini-flash-latest = alias của gemini-2.0-flash

// ── Browser Tool (Function Calling) Definition ───────────────────────────────

const browserTool = {
  functionDeclarations: [
    {
      name: 'inspect_webpage',
      description: 'Truy cập hoặc kết nối trực tiếp tới Google Chrome đang mở của lập trình viên trên cổng 9222 để thu thập: Tiêu đề trang, văn bản nội dung chính, danh sách logs trong tab Console và ảnh chụp màn hình (screenshot dạng WebP Base64). Công cụ này cực kỳ hữu ích khi lập trình viên hỏi AI về lỗi layout, lỗi Console log, hoặc muốn AI xem giao diện thực tế để nhận xét.',
      parameters: {
        type: 'OBJECT',
        properties: {
          url: {
            type: 'STRING',
            description: 'URL đầy đủ của trang web cần kiểm tra (ví dụ: http://localhost:5173 hoặc https://google.com).'
          }
        },
        required: ['url']
      }
    }
  ]
};

// ── Embeddings ────────────────────────────────────────────────────────────────

/**
 * Embed a batch of texts.
 * Returns float32 array[] (one per text).
 * Batches internally to stay within API limits.
 */
async function embedTexts(texts, requestOptions = {}) {
  // gemini-embedding-001 requires apiVersion:'v1beta'
  const model = genAI.getGenerativeModel({ model: EMBED_MODEL }, { apiVersion: 'v1beta' });
  const BATCH = 20; // max per request
  const all = [];

  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(t => model.embedContent(t, requestOptions))
    );
    results.forEach(r => all.push(r.embedding.values));
  }

  return all;
}

/**
 * Embed a single query string.
 */
async function embedQuery(text, requestOptions = {}) {
  const [vec] = await embedTexts([text], requestOptions);
  return vec;
}

// ── Text generation ───────────────────────────────────────────────────────────

/**
 * Generate text (non-streaming) with support for Browser Tool (Function Calling)
 */
async function generateText(prompt, { temperature = 0.3, maxTokens = 8192, signal, useTools = true } = {}) {
  const modelOptions = {
    model: CHAT_MODEL,
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };

  if (useTools) {
    modelOptions.tools = [browserTool];
  }

  const model = genAI.getGenerativeModel(modelOptions);

  // Khởi tạo nội dung hội thoại ban đầu
  const contents = [
    { role: 'user', parts: [{ text: prompt }] }
  ];

  let result = await model.generateContent({ contents }, signal ? { signal } : undefined);
  let response = result.response;
  let toolExecuted = null;

  // Kiểm tra xem Gemini có yêu cầu gọi hàm inspect_webpage hay không
  const functionCalls = response.functionCalls();
  if (useTools && functionCalls && functionCalls.length > 0) {
    const call = functionCalls[0];
    if (call.name === 'inspect_webpage') {
      const { url } = call.args;
      console.log(`[Gemini ToolCall] AI requested inspect_webpage for URL: ${url}`);

      try {
        // Thực thi gọi hàm Puppeteer quét trình duyệt
        const browserService = require('../utils/browser.service');
        const browserData = await browserService.inspectPage(url);
        
        toolExecuted = {
          name: 'inspect_webpage',
          args: call.args,
          result: {
            title: browserData.title,
            url: browserData.url,
            logs: browserData.logs,
            // Chúng ta không gửi toàn bộ screenshot (chuỗi Base64 siêu lớn) vào prompt của Gemini để tránh vượt quota/tokens.
            // Chỉ gửi kết quả văn bản & console logs để AI phân tích. Screenshot sẽ trả về cho Frontend hiển thị.
            bodyText: browserData.bodyText,
          },
          // Lưu screenshot đầy đủ để trả về cho Frontend
          screenshot: browserData.screenshot
        };

        // Gửi kết quả gọi hàm ngược lại cho Gemini (Vòng lặp Turn 2)
        contents.push(response.candidates[0].content); // Gửi cuộc gọi hàm của AI
        contents.push({
          role: 'function',
          parts: [{
            functionResponse: {
              name: 'inspect_webpage',
              response: {
                status: 'success',
                title: browserData.title,
                url: browserData.url,
                console_logs: browserData.logs,
                page_text_content: browserData.bodyText
              }
            }
          }]
        });

        // Gọi lại Gemini để lấy câu trả lời phân tích cuối cùng
        const finalResult = await model.generateContent({ contents }, signal ? { signal } : undefined);
        response = finalResult.response;
      } catch (err) {
        console.error('[Gemini ToolCall] Execution failed:', err.message);
        
        // Trả lỗi về cho Gemini để AI tự xử lý lỗi
        contents.push(response.candidates[0].content);
        contents.push({
          role: 'function',
          parts: [{
            functionResponse: {
              name: 'inspect_webpage',
              response: {
                status: 'error',
                message: err.message
              }
            }
          }]
        });

        const finalResult = await model.generateContent({ contents }, signal ? { signal } : undefined);
        response = finalResult.response;
      }
    }
  }

  // Trả về cả câu chữ phân tích cuối cùng và thông tin tool đã chạy (để vẽ screenshot ở Frontend)
  return {
    text: response.text(),
    toolExecuted
  };
}

/**
 * Async generator that yields text chunks from Gemini streaming.
 */
async function* generateStream(prompt, { temperature = 0.3, maxTokens = 8192, signal } = {}) {
  const model = genAI.getGenerativeModel({
    model: CHAT_MODEL,
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  });
  try {
    const result = await model.generateContentStream(prompt, signal ? { signal } : undefined);
    for await (const chunk of result.stream) {
      try {
        const text = chunk.text();
        if (text) yield text;
      } catch (chunkErr) {
        // Skip malformed chunks (e.g. safety filter fragments)
        console.warn('[generateStream] skipping chunk:', chunkErr.message);
      }
    }
  } catch (err) {
    // Re-throw so callers (chat.js routes) can handle 429 / RESOURCE_EXHAUSTED
    throw err;
  }
}

module.exports = { embedTexts, embedQuery, generateText, generateStream, browserTool };

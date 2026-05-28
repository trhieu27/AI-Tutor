const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

// text-embedding-004 requires v1beta (passed as 2nd arg to getGenerativeModel)
// Using gemini-embedding-001 = same model as old Python service (GoogleGenerativeAIEmbeddings)
const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const EMBED_MODEL = 'models/gemini-embedding-2';
const CHAT_MODEL = 'gemini-2.5-flash';
const VISION_MODEL = 'gemini-2.5-flash-lite';
const LITE_MODEL = 'gemini-2.5-flash-lite';

// Model resolver: 'chat' | 'vision' | 'lite'
function resolveModel(tier) {
    if (tier === 'vision') return VISION_MODEL;
    if (tier === 'lite') return LITE_MODEL;
    return CHAT_MODEL;
}

// ── Browser Tool (Function Calling) Definition ───────────────────────────────

const browserTool = {
    functionDeclarations: [{
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
    }]
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
async function generateText(prompt, { temperature = 0.3, maxTokens = 8192, signal, useTools = false, modelTier = 'chat' } = {}) {
    const selectedModel = resolveModel(modelTier);
    const enableTools = useTools && modelTier === 'chat';
    const modelOptions = {
        model: selectedModel,
        generationConfig: { temperature, maxOutputTokens: maxTokens },
    };

    if (enableTools) {
        modelOptions.tools = [browserTool];
    }

    const model = genAI.getGenerativeModel(modelOptions);

    // Lite/Vision: simple generation, return plain text string
    if (modelTier !== 'chat') {
        const result = await model.generateContent(prompt, signal ? { signal } : undefined);
        return result.response.text();
    }

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
 * Yields Gemini's native chunks directly — no artificial splitting.
 *
 * @param {number} [opts.thinkingBudget] - Limit Gemini 2.5's internal thinking
 *   tokens. Lower = faster TTFT but potentially less thorough answers.
 *   0 = disable thinking. undefined = model default (unlimited).
 */
async function* generateStream(prompt, { temperature = 0.3, maxTokens = 8192, signal, modelTier = 'chat', thinkingBudget } = {}) {
    const generationConfig = { temperature, maxOutputTokens: maxTokens };
    // Limit thinking phase for faster Time-to-First-Token (Gemini 2.5 Flash/Pro)
    if (typeof thinkingBudget === 'number') {
        generationConfig.thinkingConfig = { thinkingBudget };
    }
    const model = genAI.getGenerativeModel({
        model: resolveModel(modelTier),
        generationConfig,
    });
    try {
        const result = await model.generateContentStream(prompt, signal ? { signal } : undefined);
        for await (const chunk of result.stream) {
            try {
                const text = chunk.text();
                if (!text) continue;
                if (signal?.aborted) return;
                yield text;
            } catch (chunkErr) {
                console.warn('[generateStream] skipping chunk:', chunkErr.message);
            }
        }
    } catch (err) {
        throw err;
    }
}

// ── Multi-turn Chat Stream (like ChatGPT/Claude) ─────────────────────────────

/**
 * Multi-turn chat stream using Gemini's native ChatSession.
 * This is the industry-standard approach used by ChatGPT, Claude, and Gemini:
 * - System instruction separated and cached (sent once)
 * - History as structured user/model turns (not text blob)
 * - Only current message sent via sendMessageStream
 *
 * @param {string} systemInstruction - System prompt (cached by Gemini)
 * @param {Array<{role: 'user'|'model', parts: [{text: string}]}>} history - Previous turns
 * @param {string} userMessage - Current user message (includes RAG context)
 * @param {object} opts - { temperature, maxTokens, signal, thinkingBudget }
 */
async function* chatStream(systemInstruction, history, userMessage, opts = {}) {
    const { temperature = 0.3, maxTokens = 8192, signal, thinkingBudget } = opts;
    const generationConfig = { temperature, maxOutputTokens: maxTokens };
    if (typeof thinkingBudget === 'number') {
        generationConfig.thinkingConfig = { thinkingBudget };
    }

    const model = genAI.getGenerativeModel({
        model: CHAT_MODEL,
        systemInstruction,
        generationConfig,
    });

    const chat = model.startChat({ history });

    try {
        const result = await chat.sendMessageStream(userMessage, signal ? { signal } : undefined);
        for await (const chunk of result.stream) {
            try {
                const text = chunk.text();
                if (!text) continue;
                if (signal?.aborted) return;
                yield text;
            } catch (chunkErr) {
                console.warn('[chatStream] skipping chunk:', chunkErr.message);
            }
        }
    } catch (err) {
        throw err;
    }
}

// ── Vision: Describe images in PDF ────────────────────────────────────────────

/**
 * Send a PDF buffer to Gemini Vision and get descriptions of images/diagrams.
 * Only describes pages where PDF.js detected image operators.
 * @param {Buffer} pdfBuffer - Raw PDF file buffer
 * @param {number} pageCount - Total pages in the PDF
 * @param {number[]} imagePageNums - Page numbers with detected images
 * @returns {Promise<Array<{page_number: number, description: string}>>}
 */
async function describeDocumentImages(pdfBuffer, pageCount, imagePageNums) {
    if (!imagePageNums || imagePageNums.length === 0) return [];

    const model = genAI.getGenerativeModel({
        model: VISION_MODEL,
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
    });

    const base64 = pdfBuffer.toString('base64');
    const pageList = imagePageNums.join(', ');
    const prompt = [
        'B\u1ea1n l\u00e0 chuy\u00ean gia ph\u00e2n t\u00edch t\u00e0i li\u1ec7u h\u1ecdc thu\u1eadt.',
        'Nhi\u1ec7m v\u1ee5: m\u00f4 t\u1ea3 CHI TI\u1ebeT m\u1ecdi h\u00ecnh \u1ea3nh, bi\u1ec3u \u0111\u1ed3, s\u01a1 \u0111\u1ed3, b\u1ea3ng bi\u1ec3u trong t\u00e0i li\u1ec7u PDF n\u00e0y.',
        '',
        'CH\u1ec8 t\u1eadp trung v\u00e0o c\u00e1c trang: ' + pageList + '. B\u1ece QUA ho\u00e0n to\u00e0n c\u00e1c trang kh\u00e1c.',
        '',
        'V\u1edbi m\u1ed7i trang c\u00f3 h\u00ecnh, tr\u1ea3 v\u1ec1 theo \u0111\u1ecbnh d\u1ea1ng:',
        '---PAGE X---',
        '1. Lo\u1ea1i h\u00ecnh: (bi\u1ec3u \u0111\u1ed3 UML, flowchart, ER diagram, b\u1ea3ng, \u0111\u1ed3 th\u1ecb, \u1ea3nh minh h\u1ecda...)',
        '2. Th\u00e0nh ph\u1ea7n ch\u00ednh: (t\u00ean class, node, c\u1ed9t, h\u00e0ng, nh\u00e3n...)',
        '3. M\u1ed1i quan h\u1ec7: (k\u1ebf th\u1eeba, ph\u1ee5 thu\u1ed9c, lu\u1ed3ng d\u1eef li\u1ec7u, m\u0169i t\u00ean...)',
        '4. N\u1ed9i dung text trong h\u00ecnh: (ghi ch\u00fa, nh\u00e3n, s\u1ed1 li\u1ec7u...)',
        '5. \u00dd ngh\u0129a t\u1ed5ng th\u1ec3: (h\u00ecnh n\u00e0y minh h\u1ecda \u0111i\u1ec1u g\u00ec trong ng\u1eef c\u1ea3nh t\u00e0i li\u1ec7u)',
        '',
        'Tr\u1ea3 l\u1eddi b\u1eb1ng ti\u1ebfng Vi\u1ec7t, chi ti\u1ebft v\u00e0 ch\u00ednh x\u00e1c.',
    ].join('\n');

    const result = await model.generateContent([{
            inlineData: {
                mimeType: 'application/pdf',
                data: base64,
            },
        },
        prompt,
    ]);

    const text = result.response.text();
    const pages = [];
    const sections = text.split(/---PAGE\s*(\d+)---/i);
    for (let i = 1; i < sections.length; i += 2) {
        const pageNum = parseInt(sections[i], 10);
        const desc = (sections[i + 1] || '').trim();
        if (pageNum > 0 && pageNum <= pageCount && desc.length > 20) {
            pages.push({ page_number: pageNum, description: desc });
        }
    }
    return pages;
}

// ── Vision: Describe images in DOCX ──────────────────────────────────────────

/**
 * Describe images extracted from a DOCX file.
 * Batches all images into a single Gemini request.
 * @param {Array<{contentType: string, base64: string, index: number}>} images
 * @returns {Promise<Array<{index: number, description: string}>>}
 */
async function describeDocxImages(images) {
    if (!images || images.length === 0) return [];

    const model = genAI.getGenerativeModel({
        model: VISION_MODEL,
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
    });

    const BATCH = 10;
    const results = [];

    for (let i = 0; i < images.length; i += BATCH) {
        const batch = images.slice(i, i + BATCH);
        const parts = [];

        for (const img of batch) {
            parts.push({
                inlineData: {
                    mimeType: img.contentType,
                    data: img.base64,
                },
            });
        }

        const indices = batch.map(function(img) { return img.index; }).join(', ');
        parts.push(
            'B\u1ea1n l\u00e0 chuy\u00ean gia ph\u00e2n t\u00edch t\u00e0i li\u1ec7u h\u1ecdc thu\u1eadt. M\u00f4 t\u1ea3 CHI TI\u1ebeT t\u1eebng h\u00ecnh \u1ea3nh/bi\u1ec3u \u0111\u1ed3/s\u01a1 \u0111\u1ed3 \u1edf tr\u00ean.\n' +
            'C\u00e1c h\u00ecnh theo th\u1ee9 t\u1ef1: ' + indices + '.\n\n' +
            'V\u1edbi m\u1ed7i h\u00ecnh, m\u00f4 t\u1ea3:\n' +
            '1. Lo\u1ea1i h\u00ecnh (bi\u1ec3u \u0111\u1ed3, s\u01a1 \u0111\u1ed3, b\u1ea3ng, \u1ea3nh minh h\u1ecda...)\n' +
            '2. C\u00e1c th\u00e0nh ph\u1ea7n v\u00e0 m\u1ed1i quan h\u1ec7\n' +
            '3. Text/nh\u00e3n trong h\u00ecnh\n' +
            '4. \u00dd ngh\u0129a t\u1ed5ng th\u1ec3\n\n' +
            'Tr\u1ea3 v\u1ec1 theo \u0111\u1ecbnh d\u1ea1ng:\n---IMAGE X---\nM\u00f4 t\u1ea3 chi ti\u1ebft.\n\nTr\u1ea3 l\u1eddi b\u1eb1ng ti\u1ebfng Vi\u1ec7t.'
        );

        const result = await model.generateContent(parts);
        const text = result.response.text();

        const sections = text.split(/---IMAGE\s*(\d+)---/i);
        for (let j = 1; j < sections.length; j += 2) {
            const idx = parseInt(sections[j], 10);
            const desc = (sections[j + 1] || '').trim();
            if (desc.length > 20) {
                results.push({ index: idx, description: desc });
            }
        }
    }

    return results;
}

/**
 * Tạo tiêu đề ngắn gọn cho phiên chat từ câu hỏi + câu trả lời đầu tiên.
 * Dùng model lite (nhanh, rẻ). Trả về string hoặc null nếu lỗi.
 */
async function generateTitle(question, answer) {
    try {
        const model = genAI.getGenerativeModel({
            model: LITE_MODEL,
            generationConfig: { temperature: 0.3, maxOutputTokens: 60 },
        });
        const prompt = `Đặt tiêu đề ngắn gọn cho cuộc hội thoại (tối đa 50 ký tự, tiếng Việt, KHÔNG viết hoa toàn bộ). Chỉ trả về tiêu đề.

Câu hỏi: ${question.slice(0, 300)}
Trả lời: ${answer.slice(0, 500)}

Tiêu đề:`;
        const result = await model.generateContent(prompt);
        let title = result.response.text().trim().replace(/^["'"""]+|["'"""]+$/g, '');
        // Nếu bị ALL CAPS → chuyển sentence case
        if (title.length > 3 && title === title.toUpperCase()) {
            title = title.charAt(0) + title.slice(1).toLowerCase();
        }
        return title.slice(0, 60) || null;
    } catch (err) {
        console.warn('[generateTitle] Failed:', err.message);
        return null;
    }
}

module.exports = { embedTexts, embedQuery, generateText, generateStream, chatStream, generateTitle, describeDocumentImages, describeDocxImages, browserTool };
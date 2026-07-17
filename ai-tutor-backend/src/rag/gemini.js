const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

// text-embedding-004 requires v1beta (passed as 2nd arg to getGenerativeModel)
// Using gemini-embedding-001 = same model as old Python service (GoogleGenerativeAIEmbeddings)
const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const EMBED_MODEL = 'models/gemini-embedding-2';
const CHAT_MODEL = 'gemini-2.5-flash';
const VISION_MODEL = 'gemini-2.5-flash-lite';
const LITE_MODEL = 'gemini-flash-lite-latest';

// Model resolver: 'chat' | 'vision' | 'lite'
function resolveModel(tier) {
    if (tier === 'vision') return VISION_MODEL;
    if (tier === 'lite') return LITE_MODEL;
    return CHAT_MODEL;
}

// Helper to wrap embedContent with retries for transient errors (503, 429, etc.)
async function embedContentWithRetry(model, text, requestOptions = {}, maxAttempts = 4) {
    let attempt = 0;
    let delay = 1000; // 1 second base delay
    while (true) {
        attempt++;
        try {
            return await model.embedContent(text, requestOptions);
        } catch (err) {
            const status = err.status || 0;
            const message = err.message || '';
            const isTransient = status === 503 || status === 500 || status === 429 || 
                                message.includes('503') || message.includes('429') || message.includes('Service Unavailable');
            
            if (isTransient && attempt < maxAttempts) {
                console.warn(`[Gemini Embed] Attempt ${attempt} failed with transient error: ${message}. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // exponential backoff
                continue;
            }
            throw err;
        }
    }
}

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
            batch.map(t => embedContentWithRetry(model, t, requestOptions))
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
 * Generate text (non-streaming)
 */
async function generateText(prompt, { temperature = 0.3, maxTokens = 8192, signal, modelTier = 'chat' } = {}) {
    const selectedModel = resolveModel(modelTier);
    const modelOptions = {
        model: selectedModel,
        generationConfig: { temperature, maxOutputTokens: maxTokens },
    };

    const model = genAI.getGenerativeModel(modelOptions);
    const result = await model.generateContent(prompt, signal ? { signal } : undefined);
    return result.response.text();
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
 * Batches pages into groups to avoid token limits on large documents.
 * @param {Buffer} pdfBuffer - Raw PDF file buffer
 * @param {number} pageCount - Total pages in the PDF
 * @param {number[]} imagePageNums - Page numbers with detected images
 * @returns {Promise<Array<{page_number: number, description: string}>>}
 */
async function describeDocumentImages(pdfBuffer, pageCount, imagePageNums) {
    if (!imagePageNums || imagePageNums.length === 0) return [];

    const base64 = pdfBuffer.toString('base64');
    const BATCH = 15; // pages per request — balances speed vs token limits
    const allPages = [];

    for (let i = 0; i < imagePageNums.length; i += BATCH) {
        const batchPages = imagePageNums.slice(i, i + BATCH);
        const batchIndex = Math.floor(i / BATCH) + 1;
        const totalBatches = Math.ceil(imagePageNums.length / BATCH);

        console.log(`   📦 Batch ${batchIndex}/${totalBatches}: trang [${batchPages.join(', ')}]`);

        const model = genAI.getGenerativeModel({
            model: VISION_MODEL,
            generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
        });

        const pageList = batchPages.join(', ');
        const prompt = [
            'Bạn là chuyên gia phân tích tài liệu học thuật.',
            'Nhiệm vụ: mô tả CHI TIẾT mọi hình ảnh, biểu đồ, sơ đồ, bảng biểu trong tài liệu PDF này.',
            '',
            'CHỈ tập trung vào các trang: ' + pageList + '. BỎ QUA hoàn toàn các trang khác.',
            '',
            'Với mỗi trang có hình, trả về theo định dạng:',
            '---PAGE X---',
            '1. Loại hình: (biểu đồ UML, flowchart, ER diagram, bảng, đồ thị, ảnh minh họa...)',
            '2. Thành phần chính: (tên class, node, cột, hàng, nhãn...)',
            '3. Mối quan hệ: (kế thừa, phụ thuộc, luồng dữ liệu, mũi tên...)',
            '4. Nội dung text trong hình: (ghi chú, nhãn, số liệu...)',
            '5. Ý nghĩa tổng thể: (hình này minh họa điều gì trong ngữ cảnh tài liệu)',
            '',
            'Trả lời bằng tiếng Việt, chi tiết và chính xác.',
        ].join('\n');

        try {
            const result = await model.generateContent([{
                    inlineData: {
                        mimeType: 'application/pdf',
                        data: base64,
                    },
                },
                prompt,
            ]);

            const text = result.response.text();
            const sections = text.split(/---PAGE\s*(\d+)---/i);
            let batchDescribed = 0;
            for (let j = 1; j < sections.length; j += 2) {
                const pageNum = parseInt(sections[j], 10);
                const desc = (sections[j + 1] || '').trim();
                if (pageNum > 0 && pageNum <= pageCount && desc.length > 20) {
                    allPages.push({ page_number: pageNum, description: desc });
                    batchDescribed++;
                }
            }
            console.log(`   ✔️  Batch ${batchIndex}: mô tả ${batchDescribed}/${batchPages.length} trang`);
        } catch (batchErr) {
            console.warn(`   ⚠️  Batch ${batchIndex} lỗi (bỏ qua): ${batchErr.message}`);
            // Continue with next batch — don't fail the entire vision process
        }
    }

    return allPages;
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
            'Bạn là chuyên gia phân tích tài liệu học thuật. Mô tả CHI TIẾT từng hình ảnh/biểu đồ/sơ đồ ở trên.\n' +
            'Các hình theo thứ tự: ' + indices + '.\n\n' +
            'Với mỗi hình, mô tả:\n' +
            '1. Loại hình (biểu đồ, sơ đồ, bảng, ảnh minh họa...)\n' +
            '2. Các thành phần và mối quan hệ\n' +
            '3. Text/nhãn trong hình\n' +
            '4. Ý nghĩa tổng thể\n\n' +
            'Trả về theo định dạng:\n---IMAGE X---\nMô tả chi tiết.\n\nTrả lời bằng tiếng Việt.'
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

/**
 * Tạo 2-3 câu hỏi gợi ý tiếp theo dựa trên câu hỏi và câu trả lời.
 * Dùng model lite (nhanh, rẻ). Trả về mảng string hoặc [] nếu lỗi.
 */
async function generateSuggestions(question, answer) {
    try {
        const model = genAI.getGenerativeModel({
            model: LITE_MODEL,
            generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
        });
        const prompt = `Dựa trên câu hỏi và câu trả lời dưới đây, gợi ý 3 câu hỏi tiếp theo mà sinh viên có thể muốn hỏi để hiểu sâu hơn. Câu hỏi ngắn gọn (tối đa 60 ký tự), bằng tiếng Việt.

Trả về CHÍNH XÁC dạng JSON array, không giải thích:
["câu hỏi 1", "câu hỏi 2", "câu hỏi 3"]

Câu hỏi: ${question.slice(0, 300)}
Trả lời: ${answer.slice(0, 800)}`;
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        // Extract JSON array from response
        const match = text.match(/\[.*\]/s);
        if (match) text = match[0];
        const suggestions = JSON.parse(text);
        return Array.isArray(suggestions) ? suggestions.slice(0, 3).map(s => String(s).slice(0, 80)) : [];
    } catch (err) {
        console.warn('[generateSuggestions] Failed:', err.message);
        return [];
    }
}

/**
 * Format raw note text and generate a tag using Gemini lite.
 * Returns { formatted, tag }.
 */
async function formatNote(rawText) {
    try {
        const model = genAI.getGenerativeModel({
            model: LITE_MODEL,
            generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
        });
        const prompt = `Bạn là trợ lý học tập. Định dạng lại đoạn ghi chú sau thành markdown ngắn gọn, rõ ràng. Sau đó gắn một tag phân loại (ví dụ: "Định nghĩa", "Công thức", "Ví dụ", "Quy trình", "So sánh", "Tóm tắt").

Trả về CHÍNH XÁC dạng JSON, không giải thích:
{"formatted": "nội dung markdown", "tag": "tên tag"}

Ghi chú gốc:
${rawText.slice(0, 1500)}`;
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        const match = text.match(/\{[\s\S]*\}/);
        if (match) text = match[0];
        const parsed = JSON.parse(text);
        return {
            formatted: String(parsed.formatted || rawText).slice(0, 3000),
            tag: String(parsed.tag || 'Ghi chú').slice(0, 30),
        };
    } catch (err) {
        console.warn('[formatNote] Failed:', err.message);
        return { formatted: rawText, tag: 'Ghi chú' };
    }
}

module.exports = { embedTexts, embedQuery, generateText, generateStream, chatStream, generateTitle, generateSuggestions, describeDocumentImages, describeDocxImages, formatNote };
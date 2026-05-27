const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { Document, ChatSession, User } = require('../db/models');
const { authMiddleware } = require('../middleware/auth');
const { requireChatQuota, recordChatUsage, checkAndRecordAiQuota, isUserPro } = require('../utils/quota');
const { sendAdminRealtimeEvent } = require('../utils/notifications');
const config = require('../config');
const rag = require('../rag/pipeline');

const INJECTION_PATTERN = /ignore (all |previous |above )?instructions?|forget (everything|all|your instructions?)|(reveal|output|print|show|display) (the |your )?(system |original )?prompt|you are now|act as (a |an )?(different|new)|jailbreak|DAN mode/i;
const CTRL_CHAR_PATTERN = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;
const QUIZ_CACHE_VERSION = 2;

function sanitizeQuestion(text) {
  const cleaned = text.replace(CTRL_CHAR_PATTERN, '').trim();
  if (INJECTION_PATTERN.test(cleaned)) {
    const err = new Error('Câu hỏi chứa nội dung không hợp lệ. Vui lòng đặt câu hỏi khác.');
    err.statusCode = 400;
    throw err;
  }
  return cleaned;
}

/**
 * Normalize quiz item to frontend format:
 *   options: string[]  (array of 4 choices)
 *   correct_indices: number[] (array of 0-based indices)
 *
 * Handles:
 *   - New multi-select format (array + correct_indices)
 *   - Legacy single-select format (array + correct_index)
 *   - Old format ({A,B,C,D} object + correct_answer letter)
 */
function normalizeQuiz(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(item => {
    if (!item || typeof item !== 'object') return null;

    // New format: correct_indices is already an array
    if (Array.isArray(item.options) && Array.isArray(item.correct_indices)) {
      return item;
    }

    // Legacy format: correct_index is a single number → convert to array
    if (Array.isArray(item.options) && typeof item.correct_index === 'number') {
      return { ...item, correct_indices: [item.correct_index] };
    }

    // Old format: options is {A,B,C,D} object, correct_answer is letter
    if (item.options && typeof item.options === 'object' && !Array.isArray(item.options)) {
      const keys = ['A', 'B', 'C', 'D'];
      const options = keys.map(k => item.options[k] || '');
      const correctLetter = (item.correct_answer || '').toUpperCase();
      const correct_index = keys.indexOf(correctLetter);
      return {
        question: item.question || '',
        options,
        correct_indices: [correct_index >= 0 ? correct_index : 0],
        explanation: item.explanation || '',
      };
    }

    return null;
  }).filter(Boolean);
}

function normalizeStudyQuestions(value) {
  const numberedPrefix = /^\s*(?:[-*]\s*)?\*{0,2}\d{1,2}\s*[\).\-\:]\s*\*{0,2}\s*/;
  const lines = Array.isArray(value) ? value : String(value || '').split('\n');

  return lines
    .map(line => String(line || '').trim())
    .filter(line => numberedPrefix.test(line))
    .map(line => line.replace(numberedPrefix, '').trim())
    .filter(line => line.length > 5);
}

function cleanStoredStudyQuestions(lines) {
  const introPattern = /^(chào|dưới đây|sau đây|đây là|tất nhiên|mình sẽ|lưu ý|kết luận|hy vọng)/i;
  return lines
    .map(line => String(line || '').trim())
    .filter(line => line.length > 5)
    .filter(line => !introPattern.test(line))
    .filter(line => line.includes('?') || line.length < 180);
}

function formatStudyQuestions(questions) {
  return questions.map((question, index) => `${index + 1}. ${question}`).join('\n');
}

function readQuizCache(cache) {
  if (!cache) return { version: 0, items: [] };
  if (Array.isArray(cache)) return { version: 1, items: normalizeQuiz(cache) };
  if (Array.isArray(cache.items)) {
    return {
      version: Number(cache.version) || 0,
      items: normalizeQuiz(cache.items),
    };
  }
  return { version: 0, items: [] };
}


// POST /api/v1/chat/:documentId/ask
router.post('/:documentId/ask', authMiddleware, requireChatQuota(), async (req, res) => {
  let clientClosed = false;
  const requestController = new AbortController();
  const abortGeminiRequest = () => {
    if (!requestController.signal.aborted) requestController.abort();
  };
  const markClientClosed = () => {
    clientClosed = true;
    abortGeminiRequest();
  };
  req.on('aborted', markClientClosed);
  res.on('close', () => {
    if (!res.writableEnded) markClientClosed();
  });
  const isClientClosed = () => clientClosed || req.aborted || (res.destroyed && !res.writableEnded);

  try {
    const { documentId } = req.params;
    const { question, session_id } = req.body;

    const doc = await Document.findOne({ id: documentId });
    if (!doc || !doc.chroma_collection_id) {
      return res.status(404).json({ detail: 'Tài liệu không tồn tại hoặc chưa được xử lý' });
    }

    // Get existing session or prepare a new one. New sessions are created only
    // after the answer is ready so cancelled requests do not leave empty history.
    const requestedSessionId = session_id;
    const sessionId = requestedSessionId || uuidv4();
    let sessionData;
    if (requestedSessionId) {
      sessionData = await ChatSession.findOne({ id: sessionId, user_id: req.userId, document_id: documentId }).lean();
      if (!sessionData) return res.status(404).json({ detail: 'Phiên chat không tồn tại' });
    } else {
      sessionData = { messages: [] };
    }

    // Build context window by tier
    const isPro = await isUserPro(req.userId);

    const historyMsgs = sessionData.messages || [];
    let contextMsgs, maxCharPerMsg;
    if (isPro) {
      contextMsgs = historyMsgs;
      maxCharPerMsg = 4000;
    } else {
      contextMsgs = historyMsgs.slice(-config.freeLimits.contextMessages);
      maxCharPerMsg = config.freeLimits.msgChars;
    }

    const chatHistory = contextMsgs.map(m => ({
      role: m.role === 'user' ? 'human' : 'ai',
      content: m.content.slice(0, maxCharPerMsg),
    }));

    // Sanitize question
    let questionText;
    try {
      questionText = sanitizeQuestion(question || '');
    } catch (err) {
      return res.status(err.statusCode || 400).json({ detail: err.message });
    }

    if (!isPro && questionText.length > config.freeLimits.questionChars) {
      return res.status(400).json({
        detail: `Tài khoản miễn phí giới hạn câu hỏi tối đa ${config.freeLimits.questionChars} ký tự (${questionText.length} đã nhập). Nâng cấp Pro để hỏi không giới hạn.`
      });
    }

    if (isClientClosed()) return;

    // Build document metadata for retrieval router
    const debug = req.headers['x-debug'] === 'true';
    const documentMetadata = {
      pageCount: doc.page_count || 0,
      status: doc.status,
      updatedAt: doc.updated_at,
      uploadedAt: doc.uploaded_at,
    };

    // Call production-grade RAG pipeline
    const { answer, sources, pipeline } = await rag.ask(doc.chroma_collection_id, questionText, chatHistory, {
      signal: requestController.signal,
      documentMetadata,
      debug,
    });

    if (isClientClosed()) return;

    const userMsg = { id: uuidv4(), session_id: sessionId, role: 'user', content: question, sources: [] };
    const aiMsg = { id: uuidv4(), session_id: sessionId, role: 'assistant', content: answer, sources };

    if (requestedSessionId) {
      await ChatSession.updateOne(
        { id: sessionId, user_id: req.userId, document_id: documentId },
        { $push: { messages: { $each: [userMsg, aiMsg] } }, $set: { updated_at: new Date() } }
      );
    } else {
      await ChatSession.create({
        id: sessionId,
        user_id: req.userId,
        document_id: documentId,
        title: (questionText || '').slice(0, 50),
        messages: [userMsg, aiMsg],
      });
    }

    await recordChatUsage(req.userId);
    sendAdminRealtimeEvent('chat_message_created', {
      user_id: req.userId,
      document_id: documentId,
      session_id: sessionId,
    }).catch((eventErr) => console.warn('[AdminRealtime] chat_message_created failed:', eventErr.message));

    if (isClientClosed()) return;

    res.json({ session_id: sessionId, message: aiMsg, pipeline });
  } catch (err) {
    if (isClientClosed()) return;
    if (err?.name === 'AbortError' || requestController.signal.aborted) {
      return res.status(499).json({ detail: 'Yêu cầu đã được hủy.' });
    }
    const msg = String(err.message);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      // Use 503 (not 429) so frontend doesn't confuse Gemini rate-limit with app quota
      return res.status(503).json({ detail: 'Bộ não AI hiện đang quá tải lượt dùng. Vui lòng thử lại sau giây lát nhé.' });
    }
    console.error('Chat Error:', err.message);
    res.status(500).json({ detail: 'Hệ thống đang bận hoặc gặp lỗi xử lý. Vui lòng thử lại sau nhé.' });
  }
});

// POST /api/v1/chat/:documentId/ask-stream  — SSE STREAMING
router.post('/:documentId/ask-stream', authMiddleware, requireChatQuota(), async (req, res) => {
  const requestController = new AbortController();
  let clientClosed = false;

  const markClientClosed = () => {
    clientClosed = true;
    if (!requestController.signal.aborted) requestController.abort();
  };
  req.on('aborted', markClientClosed);
  req.on('close', markClientClosed);

  // Helper to safely write SSE (no-op after client disconnect)
  function sseWrite(event, data) {
    if (clientClosed) return;
    try {
      res.write('event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n');
    } catch (e) { /* ignore write-after-end */ }
  }

  try {
    const documentId = req.params.documentId;
    var body = req.body || {};
    var question = body.question;
    var session_id = body.session_id;

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const doc = await Document.findOne({ id: documentId });
    if (!doc || !doc.chroma_collection_id) {
      sseWrite('error', { detail: 'T\u00e0i li\u1ec7u kh\u00f4ng t\u1ed3n t\u1ea1i ho\u1eb7c ch\u01b0a \u0111\u01b0\u1ee3c x\u1eed l\u00fd' });
      return res.end();
    }

    // Get existing session or prepare a new one
    const requestedSessionId = session_id;
    const sessionId = requestedSessionId || uuidv4();
    let sessionData;
    if (requestedSessionId) {
      sessionData = await ChatSession.findOne({ id: sessionId, user_id: req.userId, document_id: documentId }).lean();
      if (!sessionData) {
        sseWrite('error', { detail: 'Phi\u00ean chat kh\u00f4ng t\u1ed3n t\u1ea1i' });
        return res.end();
      }
    } else {
      sessionData = { messages: [] };
    }

    // Build context window by tier
    const isPro = await isUserPro(req.userId);
    const historyMsgs = sessionData.messages || [];
    let contextMsgs, maxCharPerMsg;
    if (isPro) {
      contextMsgs = historyMsgs;
      maxCharPerMsg = 4000;
    } else {
      contextMsgs = historyMsgs.slice(-config.freeLimits.contextMessages);
      maxCharPerMsg = config.freeLimits.msgChars;
    }

    const chatHistory = contextMsgs.map(function (m) {
      return {
        role: m.role === 'user' ? 'human' : 'ai',
        content: m.content.slice(0, maxCharPerMsg),
      };
    });

    // Sanitize question
    let questionText;
    try {
      questionText = sanitizeQuestion(question || '');
    } catch (err) {
      sseWrite('error', { detail: err.message });
      return res.end();
    }

    if (!isPro && questionText.length > config.freeLimits.questionChars) {
      sseWrite('error', {
        detail: 'T\u00e0i kho\u1ea3n mi\u1ec5n ph\u00ed gi\u1edbi h\u1ea1n c\u00e2u h\u1ecfi t\u1ed1i \u0111a ' + config.freeLimits.questionChars + ' k\u00fd t\u1ef1 (' + questionText.length + ' \u0111\u00e3 nh\u1eadp). N\u00e2ng c\u1ea5p Pro \u0111\u1ec3 h\u1ecfi kh\u00f4ng gi\u1edbi h\u1ea1n.'
      });
      return res.end();
    }

    if (clientClosed) return res.end();

    // Build document metadata for retrieval router
    const debug = req.headers['x-debug'] === 'true';
    const documentMetadata = {
      pageCount: doc.page_count || 0,
      status: doc.status,
      updatedAt: doc.updated_at,
      uploadedAt: doc.uploaded_at,
    };

    // Stream from pipeline
    let doneEvent = null;
    for await (const event of rag.askStream(doc.chroma_collection_id, questionText, chatHistory, {
      signal: requestController.signal,
      documentMetadata: documentMetadata,
      debug: debug,
    })) {
      if (clientClosed) break;

      if (event.type === 'status') {
        sseWrite('status', { step: event.step });
      } else if (event.type === 'chunk') {
        sseWrite('chunk', { text: event.text });
      } else if (event.type === 'done') {
        doneEvent = event;
      }
    }

    if (clientClosed) return res.end();

    if (!doneEvent) {
      sseWrite('error', { detail: 'Kh\u00f4ng nh\u1eadn \u0111\u01b0\u1ee3c ph\u1ea3n h\u1ed3i t\u1eeb AI' });
      return res.end();
    }

    // Save session to DB
    const answer = doneEvent.answer;
    const sources = doneEvent.sources;
    const pipeline = doneEvent.pipeline;

    const userMsg = { id: uuidv4(), session_id: sessionId, role: 'user', content: question, sources: [] };
    const aiMsg = { id: uuidv4(), session_id: sessionId, role: 'assistant', content: answer, sources: sources };

    if (requestedSessionId) {
      await ChatSession.updateOne(
        { id: sessionId, user_id: req.userId, document_id: documentId },
        { $push: { messages: { $each: [userMsg, aiMsg] } }, $set: { updated_at: new Date() } }
      );
    } else {
      await ChatSession.create({
        id: sessionId,
        user_id: req.userId,
        document_id: documentId,
        title: (questionText || '').slice(0, 50),
        messages: [userMsg, aiMsg],
      });
    }

    // Send final done event
    sseWrite('done', {
      session_id: sessionId,
      message: aiMsg,
      sources: sources,
      pipeline: pipeline,
    });

    res.end();

    // Post-response side effects (fire-and-forget)
    recordChatUsage(req.userId).catch(function () {});
    sendAdminRealtimeEvent('chat_message_created', {
      user_id: req.userId,
      document_id: documentId,
      session_id: sessionId,
    }).catch(function (eventErr) { console.warn('[AdminRealtime] chat_message_created failed:', eventErr.message); });

  } catch (err) {
    if (clientClosed) return;
    var errName = err && err.name;
    if (errName === 'AbortError' || requestController.signal.aborted) {
      sseWrite('error', { detail: 'Y\u00eau c\u1ea7u \u0111\u00e3 \u0111\u01b0\u1ee3c h\u1ee7y.' });
      return res.end();
    }
    var msg = String(err && err.message || '');
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      sseWrite('error', { detail: 'B\u1ed9 n\u00e3o AI hi\u1ec7n \u0111ang qu\u00e1 t\u1ea3i l\u01b0\u1ee3t d\u00f9ng. Vui l\u00f2ng th\u1eed l\u1ea1i sau gi\u00e2y l\u00e1t nh\u00e9.' });
      return res.end();
    }
    console.error('Chat Stream Error:', msg);
    sseWrite('error', { detail: 'H\u1ec7 th\u1ed1ng \u0111ang b\u1eadn ho\u1eb7c g\u1eb7p l\u1ed7i x\u1eed l\u00fd. Vui l\u00f2ng th\u1eed l\u1ea1i sau nh\u00e9.' });
    res.end();
  }
});

// GET /api/v1/chat/:documentId/summarize  — STREAMING
router.get('/:documentId/summarize', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findOne({ id: req.params.documentId });
    if (!doc || !doc.chroma_collection_id) return res.status(404).json({ detail: 'Tài liệu chưa sẵn sàng' });

    if (doc.summary) {
      res.setHeader('Content-Type', 'text/plain');
      return res.send(doc.summary);
    }

    await checkAndRecordAiQuota(req.userId);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    let fullText = '';
    for await (const chunk of rag.summarize(doc.chroma_collection_id)) {
      fullText += chunk;
      res.write(chunk);
    }
    res.end();

    if (fullText.trim()) {
      await Document.updateOne({ id: req.params.documentId }, { $set: { summary: fullText } });
    }
  } catch (err) {
    console.error('Summarize error:', err.message);
    if (res.headersSent) return res.end();
    if (err.statusCode === 429) return res.status(429).json({ detail: err.message }); // app quota
    if (err.statusCode) return res.status(err.statusCode).json({ detail: err.message });
    const msg = String(err.message);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      return res.status(503).json({ detail: 'AI đang quá tải. Vui lòng thử lại sau.' });
    }
    res.status(500).json({ detail: 'Không thể tạo bản tóm tắt' });
  }
});

// GET /api/v1/chat/:documentId/quiz  — STREAMING
router.get('/:documentId/quiz', authMiddleware, async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const doc = await Document.findOne({ id: req.params.documentId });
    if (!doc || !doc.chroma_collection_id) return res.status(404).json({ detail: 'Tài liệu chưa sẵn sàng' });

    if (force) {
      await Document.updateOne({ id: req.params.documentId }, { $unset: { quiz: '' } });
    } else if (doc.quiz) {
      const cached = readQuizCache(doc.quiz);
      if (cached.version >= QUIZ_CACHE_VERSION && cached.items.length > 0) {
        res.setHeader('Content-Type', 'application/json');
        return res.send(JSON.stringify(cached.items));
      }
    }

    await checkAndRecordAiQuota(req.userId);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.write(' ');

    let fullText = '';
    for await (const chunk of rag.quiz(doc.chroma_collection_id)) {
      fullText += chunk;
      res.write(chunk);
    }
    res.end();

    if (fullText.trim()) {
      try {
        let clean = fullText.trim();
        if (clean.includes('```json')) clean = clean.split('```json')[1].split('```')[0];
        else if (clean.includes('```')) clean = clean.split('```')[1].split('```')[0];
        const parsed = JSON.parse(clean);
        const normalized = normalizeQuiz(Array.isArray(parsed) ? parsed : []);
        if (normalized.length > 0) {
          await Document.updateOne(
            { id: req.params.documentId },
            { $set: { quiz: { version: QUIZ_CACHE_VERSION, items: normalized } } }
          );
        }
      } catch (e) { console.error('Failed to cache quiz:', e.message); }
    }
  } catch (err) {
    console.error('Quiz error:', err.message);
    if (res.headersSent) return res.end();
    if (err.statusCode === 429) return res.status(429).json({ detail: err.message }); // app quota
    if (err.statusCode) return res.status(err.statusCode).json({ detail: err.message });
    const msg = String(err.message);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      return res.status(503).json({ detail: 'AI đang quá tải. Vui lòng thử lại sau.' });
    }
    res.status(500).json({ detail: 'Không thể tạo bài kiểm tra' });
  }
});

// GET /api/v1/chat/:documentId/mindmap  — STREAMING
router.get('/:documentId/mindmap', authMiddleware, async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const doc = await Document.findOne({ id: req.params.documentId });
    if (!doc || !doc.chroma_collection_id) return res.status(404).json({ detail: 'Tài liệu chưa sẵn sàng' });

    if (force) {
      await Document.updateOne({ id: req.params.documentId }, { $unset: { mindmap: '' } });
    } else if (doc.mindmap) {
      res.setHeader('Content-Type', 'text/plain');
      return res.send(doc.mindmap);
    }

    await checkAndRecordAiQuota(req.userId);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.write(' ');

    let fullText = '';
    try {
      for await (const chunk of rag.mindmap(doc.chroma_collection_id)) {
        fullText += chunk;
        res.write(chunk);
      }
    } catch (streamErr) {
      // Stream already started — signal error via special marker
      console.error('[Mindmap] Stream error:', streamErr.message, streamErr.stack);
      const msg = String(streamErr.message);
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || streamErr.statusCode === 429) {
        res.write('\n__ERROR__:AI đang quá tải lượt dùng. Vui lòng thử lại sau ít phút. quota');
      } else if (msg.includes('quota') || msg.includes('quá tải')) {
        res.write(`\n__ERROR__:${streamErr.message} quota`);
      } else {
        res.write(`\n__ERROR__:Lỗi tạo sơ đồ: ${msg.slice(0, 200)}`);
      }
      return res.end();
    }
    res.end();

    if (fullText.trim()) {
      await Document.updateOne({ id: req.params.documentId }, { $set: { mindmap: fullText } });
    }
  } catch (err) {
    console.error('[Mindmap] Outer error:', err.message, err.stack);
    if (res.headersSent) return res.end();
    if (err.statusCode === 429) return res.status(429).json({ detail: err.message });
    if (err.statusCode) return res.status(err.statusCode).json({ detail: err.message });
    const msg = String(err.message);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      return res.status(503).json({ detail: 'AI đang quá tải. Vui lòng thử lại sau.' });
    }
    res.status(500).json({ detail: `Không thể tạo sơ đồ tư duy: ${msg.slice(0, 200)}` });
  }
});

// PUT /api/v1/chat/:documentId/mindmap
router.put('/:documentId/mindmap', authMiddleware, async (req, res) => {
  try {
    const { mindmap_code } = req.body;
    if (!mindmap_code) return res.status(400).json({ detail: 'Thiếu mã sơ đồ tư duy' });

    const result = await Document.updateOne(
      { id: req.params.documentId, owner_id: req.userId },
      { $set: { mindmap: mindmap_code, updated_at: new Date() } }
    );
    if (result.matchedCount === 0) {
      const doc = await Document.findOne({ id: req.params.documentId });
      if (!doc) return res.status(404).json({ detail: 'Không tìm thấy tài liệu' });
      return res.status(403).json({ detail: 'Bạn không có quyền chỉnh sửa tài liệu này' });
    }
    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /api/v1/chat/:documentId/study-questions  — STREAMING
router.get('/:documentId/study-questions', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findOne({ id: req.params.documentId });
    if (!doc || !doc.chroma_collection_id) return res.status(404).json({ detail: 'Tài liệu chưa sẵn sàng' });

    if (doc.study_questions?.length) {
      const cachedQuestions = normalizeStudyQuestions(doc.study_questions);
      const questions = cachedQuestions.length ? cachedQuestions : cleanStoredStudyQuestions(doc.study_questions);
      res.setHeader('Content-Type', 'text/plain');
      if (questions.length && questions.length !== doc.study_questions.length) {
        await Document.updateOne({ id: req.params.documentId }, { $set: { study_questions: questions } });
      }
      return res.send(formatStudyQuestions(questions.length ? questions : doc.study_questions));
    }

    await checkAndRecordAiQuota(req.userId);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.write(' ');

    let fullText = '';
    for await (const chunk of rag.studyQuestions(doc.chroma_collection_id)) {
      fullText += chunk;
      res.write(chunk);
    }
    res.end();

    if (fullText.trim()) {
      const questions = normalizeStudyQuestions(fullText);
      await Document.updateOne({ id: req.params.documentId }, { $set: { study_questions: questions } });
    }
  } catch (err) {
    console.error('StudyQuestions error:', err.message);
    if (res.headersSent) return res.end();
    if (err.statusCode === 429) return res.status(429).json({ detail: err.message }); // app quota
    if (err.statusCode) return res.status(err.statusCode).json({ detail: err.message });
    const msg = String(err.message);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      return res.status(503).json({ detail: 'AI đang quá tải. Vui lòng thử lại sau.' });
    }
    res.status(500).json({ detail: 'Không thể tạo câu hỏi ôn tập' });
  }
});

// GET /api/v1/chat/sessions/recent
router.get('/sessions/recent', authMiddleware, async (req, res) => {
  try {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 20) : 5;

    const sessions = await ChatSession.find({ user_id: req.userId })
      .sort({ updated_at: -1 })
      .limit(limit)
      .lean();

    const documentIds = [...new Set(sessions.map(s => s.document_id).filter(Boolean))];
    const documents = await Document.find({
      id: { $in: documentIds },
      owner_id: req.userId,
    }).select('id file_name status page_count uploaded_at').lean();
    const docsById = new Map(documents.map(doc => [doc.id, doc]));

    const result = sessions.map(s => {
      const doc = docsById.get(s.document_id);
      return {
        id: s.id,
        user_id: s.user_id,
        document_id: s.document_id,
        document_name: doc?.file_name || null,
        document_status: doc?.status || null,
        page_count: doc?.page_count || 0,
        title: s.title,
        created_at: s.created_at,
        updated_at: s.updated_at,
        message_count: (s.messages || []).length,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Recent chat sessions error:', err.message);
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// GET /api/v1/chat/:documentId/sessions
router.get('/:documentId/sessions', authMiddleware, async (req, res) => {
  try {
    const sessions = await ChatSession.find({
      document_id: req.params.documentId,
      user_id: req.userId,
    }).sort({ updated_at: -1 }).limit(100).lean();

    const result = sessions.map(s => ({
      id: s.id,
      user_id: s.user_id,
      document_id: s.document_id,
      title: s.title,
      created_at: s.created_at,
      updated_at: s.updated_at,
      message_count: (s.messages || []).length,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// GET /api/v1/chat/sessions/:sessionId
router.get('/sessions/:sessionId', authMiddleware, async (req, res) => {
  try {
    const session = await ChatSession.findOne({ id: req.params.sessionId, user_id: req.userId }).lean();
    if (!session) return res.status(404).json({ detail: 'Không tìm thấy phiên chat' });

    const messages = (session.messages || []).map(m => ({ ...m, session_id: session.id }));
    res.json({
      id: session.id,
      user_id: session.user_id,
      document_id: session.document_id,
      title: session.title,
      created_at: session.created_at,
      updated_at: session.updated_at,
      message_count: messages.length,
      messages,
    });
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// DELETE /api/v1/chat/sessions/:sessionId
router.delete('/sessions/:sessionId', authMiddleware, async (req, res) => {
  try {
    const result = await ChatSession.deleteOne({ id: req.params.sessionId, user_id: req.userId });
    if (result.deletedCount === 0) return res.status(404).json({ detail: 'Không thể xóa phiên chat' });
    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

module.exports = router;

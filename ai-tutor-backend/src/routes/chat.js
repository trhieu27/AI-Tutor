const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { Document, ChatSession, User } = require('../db/models');
const { authMiddleware } = require('../middleware/auth');
const { requireChatQuota, recordChatUsage, checkAndRecordAiQuota } = require('../utils/quota');
const config = require('../config');
const rag = require('../rag/pipeline');

const INJECTION_PATTERN = /ignore (all |previous |above )?instructions?|forget (everything|all|your instructions?)|(reveal|output|print|show|display) (the |your )?(system |original )?prompt|you are now|act as (a |an )?(different|new)|jailbreak|DAN mode/i;
const CTRL_CHAR_PATTERN = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

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
 *   correct_index: number (0-based index)
 *
 * Handles both new format (array + correct_index) and
 * old format ({A,B,C,D} object + correct_answer letter).
 */
function normalizeQuiz(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(item => {
    if (!item || typeof item !== 'object') return null;

    // Already in new format
    if (Array.isArray(item.options) && typeof item.correct_index === 'number') {
      return item;
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
        correct_index: correct_index >= 0 ? correct_index : 0,
        explanation: item.explanation || '',
      };
    }

    return null;
  }).filter(Boolean);
}


// POST /api/v1/chat/:documentId/ask
router.post('/:documentId/ask', authMiddleware, requireChatQuota(), async (req, res) => {
  try {
    const { documentId } = req.params;
    const { question, session_id } = req.body;

    const doc = await Document.findOne({ id: documentId });
    if (!doc || !doc.chroma_collection_id) {
      return res.status(404).json({ detail: 'Tài liệu không tồn tại hoặc chưa được xử lý' });
    }

    // Get or create session
    let sessionId = session_id;
    let sessionData;
    if (!sessionId) {
      sessionId = uuidv4();
      const newSession = await ChatSession.create({
        id: sessionId,
        user_id: req.userId,
        document_id: documentId,
        title: (question || '').slice(0, 50) + '...',
        messages: [],
      });
      sessionData = newSession.toObject();
    } else {
      sessionData = await ChatSession.findOne({ id: sessionId }).lean();
      if (!sessionData) return res.status(404).json({ detail: 'Phiên chat không tồn tại' });
    }

    // Build context window by tier
    const user = await User.findOne({ id: req.userId });
    const isPro = Boolean(user?.is_pro);

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

    // Call Node.js RAG pipeline
    const { answer, sources } = await rag.ask(doc.chroma_collection_id, questionText, chatHistory);

    const userMsg = { id: uuidv4(), session_id: sessionId, role: 'user', content: question, sources: [] };
    const aiMsg  = { id: uuidv4(), session_id: sessionId, role: 'assistant', content: answer, sources };

    await ChatSession.updateOne(
      { id: sessionId },
      { $push: { messages: { $each: [userMsg, aiMsg] } }, $set: { updated_at: new Date() } }
    );

    await recordChatUsage(req.userId);

    res.json({ session_id: sessionId, message: aiMsg });
  } catch (err) {
    const msg = String(err.message);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      // Use 503 (not 429) so frontend doesn't confuse Gemini rate-limit with app quota
      return res.status(503).json({ detail: 'Bộ não AI hiện đang quá tải lượt dùng. Vui lòng thử lại sau giây lát nhé.' });
    }
    console.error('Chat Error:', err.message);
    res.status(500).json({ detail: 'Hệ thống đang bận hoặc gặp lỗi xử lý. Vui lòng thử lại sau nhé.' });
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
    if (err.statusCode === 429) return res.status(429).json({ detail: err.message }); // app quota
    if (err.statusCode) return res.status(err.statusCode).json({ detail: err.message });
    const msg = String(err.message);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      return res.status(503).json({ detail: 'AI đang quá tải. Vui lòng thử lại sau.' });
    }
    console.error('Summarize error:', err.message);
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
      const normalized = normalizeQuiz(Array.isArray(doc.quiz) ? doc.quiz : []);
      res.setHeader('Content-Type', 'application/json');
      return res.send(JSON.stringify(normalized));
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
          await Document.updateOne({ id: req.params.documentId }, { $set: { quiz: normalized } });
        }
      } catch (e) { console.error('Failed to cache quiz:', e.message); }
    }
  } catch (err) {
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
    for await (const chunk of rag.mindmap(doc.chroma_collection_id)) {
      fullText += chunk;
      res.write(chunk);
    }
    res.end();

    if (fullText.trim()) {
      await Document.updateOne({ id: req.params.documentId }, { $set: { mindmap: fullText } });
    }
  } catch (err) {
    if (err.statusCode === 429) return res.status(429).json({ detail: err.message }); // app quota
    if (err.statusCode) return res.status(err.statusCode).json({ detail: err.message });
    const msg = String(err.message);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      return res.status(503).json({ detail: 'AI đang quá tải. Vui lòng thử lại sau.' });
    }
    res.status(500).json({ detail: 'Không thể tạo sơ đồ tư duy' });
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
      res.setHeader('Content-Type', 'text/plain');
      return res.send(doc.study_questions.join('\n'));
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
      const questions = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      await Document.updateOne({ id: req.params.documentId }, { $set: { study_questions: questions } });
    }
  } catch (err) {
    if (err.statusCode === 429) return res.status(429).json({ detail: err.message }); // app quota
    if (err.statusCode) return res.status(err.statusCode).json({ detail: err.message });
    const msg = String(err.message);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      return res.status(503).json({ detail: 'AI đang quá tải. Vui lòng thử lại sau.' });
    }
    res.status(500).json({ detail: 'Không thể tạo câu hỏi ôn tập' });
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

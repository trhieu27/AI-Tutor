const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { ShareLink, ChatSession, Document } = require('../db/models');
const { authMiddleware } = require('../middleware/auth');

// POST /api/v1/share — Create share link for a chat session
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) {
      return res.status(400).json({ detail: 'Thiếu session_id' });
    }

    // Verify ownership
    const session = await ChatSession.findOne({ id: session_id, user_id: req.userId });
    if (!session) return res.status(404).json({ detail: 'Cuộc trò chuyện không tồn tại hoặc không thuộc về bạn' });
    if (!session.messages || session.messages.length === 0) {
      return res.status(400).json({ detail: 'Cuộc trò chuyện chưa có tin nhắn' });
    }

    // Check if share link already exists
    const existing = await ShareLink.findOne({
      owner_id: req.userId,
      resource_type: 'chat',
      resource_id: session_id,
    });
    if (existing) {
      return res.json({
        id: existing.id,
        view_count: existing.view_count,
        created_at: existing.created_at,
      });
    }

    const link = await ShareLink.create({
      id: uuidv4(),
      owner_id: req.userId,
      resource_type: 'chat',
      resource_id: session_id,
    });

    res.status(201).json({
      id: link.id,
      view_count: 0,
      created_at: link.created_at,
    });
  } catch (err) {
    console.error('Create share link error:', err.message);
    res.status(500).json({ detail: 'Lỗi tạo link chia sẻ' });
  }
});

// GET /api/v1/share/:id — Clone shared chat into user's history, return redirect info
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const link = await ShareLink.findOne({ id: req.params.id });
    if (!link) return res.status(404).json({ detail: 'Link chia sẻ không tồn tại' });

    if (link.expires_at && link.expires_at < new Date()) {
      return res.status(410).json({ detail: 'Link chia sẻ đã hết hạn' });
    }

    const session = await ChatSession.findOne({ id: link.resource_id }).lean();
    if (!session) return res.status(404).json({ detail: 'Cuộc trò chuyện không còn tồn tại' });

    // If the requester is the owner, return the original session
    if (req.userId === link.owner_id) {
      return res.json({
        document_id: session.document_id,
        session_id: session.id,
        is_owner: true,
      });
    }

    // ── Ensure user has a cloned document ──────────────────────────────────
    const origDocId = session.document_id;
    let userDoc = await Document.findOne({ owner_id: req.userId, _shared_doc_id: origDocId });
    if (!userDoc) {
      const origDoc = await Document.findOne({ id: origDocId }).lean();
      if (origDoc) {
        userDoc = await Document.create({
          id: uuidv4(),
          owner_id: req.userId,
          file_name: origDoc.file_name,
          file_size_mb: origDoc.file_size_mb,
          page_count: origDoc.page_count,
          status: origDoc.status,
          chroma_collection_id: origDoc.chroma_collection_id,
          summary: origDoc.summary,
          _shared_doc_id: origDocId,
          uploaded_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
    const targetDocId = userDoc ? userDoc.id : origDocId;

    // ── Ensure user has a cloned session ──────────────────────────────────
    const existing = await ChatSession.findOne({
      user_id: req.userId,
      _shared_from: link.resource_id,
    });

    if (existing) {
      // Update existing clone with latest messages + correct doc
      await ChatSession.updateOne({ id: existing.id }, {
        $set: {
          document_id: targetDocId,
          title: session.title || 'Cuộc trò chuyện',
          messages: (session.messages || []).map(m => ({
            id: m.id || uuidv4(),
            role: m.role,
            content: m.content,
            sources: m.sources || [],
            created_at: m.created_at || new Date(),
          })),
          updated_at: new Date(),
        },
      });
      return res.json({
        document_id: targetDocId,
        session_id: existing.id,
        is_owner: false,
      });
    }

    // First time: clone session
    ShareLink.updateOne({ id: link.id }, { $inc: { view_count: 1 } }).catch(() => {});

    const cloned = await ChatSession.create({
      id: uuidv4(),
      user_id: req.userId,
      document_id: targetDocId,
      title: session.title || 'Cuộc trò chuyện',
      _shared_from: link.resource_id,
      messages: (session.messages || []).map(m => ({
        id: uuidv4(),
        role: m.role,
        content: m.content,
        sources: m.sources || [],
        created_at: m.created_at || new Date(),
      })),
      created_at: new Date(),
      updated_at: new Date(),
    });

    res.json({
      document_id: targetDocId,
      session_id: cloned.id,
      is_owner: false,
    });
  } catch (err) {
    console.error('Clone share link error:', err.message);
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// DELETE /api/v1/share/:id — Delete share link (auth, owner only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await ShareLink.deleteOne({ id: req.params.id, owner_id: req.userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ detail: 'Link không tồn tại' });
    }
    res.json({ status: 'deleted' });
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

module.exports = router;

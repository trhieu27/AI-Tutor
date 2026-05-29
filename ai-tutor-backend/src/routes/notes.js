const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { Note, Document } = require('../db/models');
const { authMiddleware } = require('../middleware/auth');
const { formatNote } = require('../rag/gemini');

// GET /api/v1/notes/:documentId — List notes for a document
router.get('/:documentId', authMiddleware, async (req, res) => {
  try {
    const notes = await Note.find({
      user_id: req.userId,
      document_id: req.params.documentId,
    }).sort({ created_at: -1 }).lean();
    res.json(notes.map(n => ({ ...n, _id: undefined })));
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// POST /api/v1/notes/:documentId — Create note
router.post('/:documentId', authMiddleware, async (req, res) => {
  try {
    const { content, session_id } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ detail: 'Nội dung ghi chú không được trống' });
    }

    // AI format + tag
    const { formatted, tag } = await formatNote(content.trim());

    const note = await Note.create({
      id: uuidv4(),
      user_id: req.userId,
      document_id: req.params.documentId,
      content: content.trim(),
      formatted,
      tag,
      source_session_id: session_id || null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    res.status(201).json({ ...note.toObject(), _id: undefined });
  } catch (err) {
    console.error('Create note error:', err.message);
    res.status(500).json({ detail: 'Lỗi tạo ghi chú' });
  }
});

// PUT /api/v1/notes/:noteId — Update note
router.put('/:noteId', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ detail: 'Nội dung không được trống' });
    }

    const result = await Note.findOneAndUpdate(
      { id: req.params.noteId, user_id: req.userId },
      { $set: { content: content.trim(), updated_at: new Date() } },
      { new: true }
    ).lean();

    if (!result) return res.status(404).json({ detail: 'Ghi chú không tồn tại' });
    res.json({ ...result, _id: undefined });
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi cập nhật' });
  }
});

// DELETE /api/v1/notes/:noteId — Delete note
router.delete('/:noteId', authMiddleware, async (req, res) => {
  try {
    const result = await Note.deleteOne({ id: req.params.noteId, user_id: req.userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ detail: 'Ghi chú không tồn tại' });
    }
    res.json({ status: 'deleted' });
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi xóa ghi chú' });
  }
});

module.exports = router;

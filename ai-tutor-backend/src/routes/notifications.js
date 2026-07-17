const express = require('express');
const router = express.Router();
const { Notification } = require('../db/models');
const { authMiddleware } = require('../middleware/auth');
const { buildPagination, parsePagination, sendPaginated } = require('../utils/pagination');

// GET /api/v1/notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 30, maxLimit: 100 });
    const query = { user_id: req.userId };
    const [total, notifications] = await Promise.all([
      Notification.countDocuments(query),
      Notification.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
    ]);
    const items = notifications.map(n => ({ ...n, _id: undefined }));
    sendPaginated(res, items, buildPagination({ page, limit, total }), req.query);
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// PATCH /api/v1/notifications/read-all
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      { user_id: req.userId, is_read: false },
      { $set: { is_read: true } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// PATCH /api/v1/notifications/:notifId/read
router.patch('/:notifId/read', authMiddleware, async (req, res) => {
  try {
    await Notification.updateOne(
      { id: req.params.notifId, user_id: req.userId },
      { $set: { is_read: true } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// DELETE /api/v1/notifications
router.delete('/', authMiddleware, async (req, res) => {
  try {
    await Notification.deleteMany({ user_id: req.userId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

module.exports = router;

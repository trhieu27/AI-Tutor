const express = require('express');
const router = express.Router();
const { Notification } = require('../db/models');
const { authMiddleware } = require('../middleware/auth');

// GET /api/v1/notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const notifications = await Notification.find({ user_id: req.userId })
      .sort({ created_at: -1 }).limit(limit).lean();
    res.json(notifications.map(n => ({ ...n, _id: undefined })));
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

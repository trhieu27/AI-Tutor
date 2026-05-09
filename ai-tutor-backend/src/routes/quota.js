const express = require('express');
const router = express.Router();
const { Document, UsageLog } = require('../db/models');
const { authMiddleware } = require('../middleware/auth');
const { getUser, usageToday } = require('../utils/quota');
const config = require('../config');

// GET /api/v1/quota/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await getUser(req.userId);
    const isPro = Boolean(user.is_pro);

    if (isPro) {
      return res.json({ is_pro: true, limits: null, usage: null });
    }

    const docCount = await Document.countDocuments({ owner_id: req.userId });
    const chatUsed = await usageToday(req.userId, 'chat_messages');
    const aiUsed = await usageToday(req.userId, 'ai_features');

    res.json({
      is_pro: false,
      limits: {
        documents:     config.freeLimits.documents,
        chat_messages: config.freeLimits.chatMessages,
        ai_features:   config.freeLimits.aiFeatures,
      },
      usage: {
        documents:     docCount,
        chat_messages: chatUsed,
        ai_features:   aiUsed,
      },
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ detail: err.message });
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

module.exports = router;

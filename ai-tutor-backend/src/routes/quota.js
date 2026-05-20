const express = require('express');
const router = express.Router();
const { Document, UsageLog, UserSubscription } = require('../db/models');
const { authMiddleware } = require('../middleware/auth');
const { getUser, usageToday, isUserPro, getUserQuotaLimit } = require('../utils/quota');
const config = require('../config');

// GET /api/v1/quota/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await getUser(userId);
    const isPro = await isUserPro(userId);

    // Get active subscription info
    const sub = await UserSubscription.findOne({ user_id: userId, status: 'active' }).lean();
    let planId = 'free';
    if (sub) {
      const isExpired = sub.expires_at && new Date(sub.expires_at) < new Date();
      if (!isExpired) {
        planId = sub.plan_id;
      }
    }

    const docCount = await Document.countDocuments({ owner_id: userId });
    const chatUsed = await usageToday(userId, 'chat_messages');
    const aiUsed = await usageToday(userId, 'ai_features');

    const limitDocs = await getUserQuotaLimit(userId, 'max_documents', 3);
    const limitChat = await getUserQuotaLimit(userId, 'chat_per_day', 30);
    const limitAi = await getUserQuotaLimit(userId, 'ai_generations_per_day', 10);
    const limitFileSize = await getUserQuotaLimit(userId, 'max_file_size_mb', 50);

    res.json({
      is_pro: isPro,
      plan: planId,
      limits: {
        documents:        limitDocs,
        chat_messages:    limitChat,
        ai_features:      limitAi,
        max_file_size_mb: limitFileSize,
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


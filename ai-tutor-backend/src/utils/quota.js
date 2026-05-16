const { UsageLog, User, UserSubscription } = require('../db/models');
const config = require('../config');

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

async function getUser(userId) {
  const user = await User.findOne({ id: userId });
  if (!user) {
    const err = new Error('Người dùng không tồn tại');
    err.statusCode = 404;
    throw err;
  }
  return user;
}

async function isUserPro(userId) {
  const sub = await UserSubscription.findOne({ user_id: userId, status: 'active' }).lean();
  if (!sub || sub.plan_id === 'free') return false;
  if (sub.expires_at && new Date(sub.expires_at) < new Date()) return false;
  return true;
}

async function usageToday(userId, feature) {
  return UsageLog.countDocuments({ user_id: userId, feature, date: todayUTC() });
}

async function recordUsage(userId, feature) {
  await UsageLog.create({ user_id: userId, feature, date: todayUTC() });
}

// ── Middleware Factories ───────────────────────────────────────────────────────

function requireDocQuota() {
  return async (req, res, next) => {
    try {
      const userId = req.userId;
      const user = await getUser(userId);
      if (await isUserPro(userId)) return next();

      const { Document } = require('../db/models');
      const total = await Document.countDocuments({ owner_id: userId });
      const limit = config.freeLimits.documents;
      if (total >= limit) {
        return res.status(402).json({
          detail: `Tài khoản miễn phí chỉ được tải lên tối đa ${limit} tài liệu. Nâng cấp Pro để không giới hạn.`
        });
      }
      next();
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ detail: err.message });
      next(err);
    }
  };
}

function requireChatQuota() {
  return async (req, res, next) => {
    try {
      const userId = req.userId;
      const user = await getUser(userId);
      if (await isUserPro(userId)) return next();

      const used = await usageToday(userId, 'chat_messages');
      const limit = config.freeLimits.chatMessages;
      if (used >= limit) {
        return res.status(429).json({
          detail: `Bạn đã dùng hết ${limit} tin nhắn miễn phí hôm nay. Nâng cấp Pro hoặc quay lại vào ngày mai.`
        });
      }
      next();
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ detail: err.message });
      next(err);
    }
  };
}

async function recordChatUsage(userId) {
  if (await isUserPro(userId)) return;
  await recordUsage(userId, 'chat_messages');
}

async function checkAndRecordAiQuota(userId) {
  if (await isUserPro(userId)) return;

  const used = await usageToday(userId, 'ai_features');
  const limit = config.freeLimits.aiFeatures;
  if (used >= limit) {
    const err = new Error(
      `Bạn đã dùng hết ${limit} lần tạo nội dung AI miễn phí hôm nay. Nâng cấp Pro hoặc quay lại vào ngày mai.`
    );
    err.statusCode = 429;
    throw err;
  }
  await recordUsage(userId, 'ai_features');
}

module.exports = {
  requireDocQuota,
  requireChatQuota,
  recordChatUsage,
  checkAndRecordAiQuota,
  usageToday,
  getUser,
  isUserPro,
};

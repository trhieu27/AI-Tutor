const { UsageLog, User, UserSubscription, SubscriptionPlan } = require('../db/models');
const config = require('../config');

async function getUserQuotaLimit(userId, field, defaultValue) {
  try {
    const sub = await UserSubscription.findOne({ user_id: userId, status: 'active' }).lean();
    let planId = 'free';
    if (sub) {
      const isExpired = sub.expires_at && new Date(sub.expires_at) < new Date();
      if (!isExpired) {
        planId = sub.plan_id;
      }
    }
    const plan = await SubscriptionPlan.findOne({ id: planId }).lean();
    if (plan && plan.quota && plan.quota[field] !== undefined) {
      return plan.quota[field];
    }
  } catch (err) {
    console.error(`Error fetching quota limit for user ${userId}, field ${field}:`, err.message);
  }
  return defaultValue;
}

async function getFreePlanLimit(field, defaultValue) {
  try {
    const freePlan = await SubscriptionPlan.findOne({ id: 'free' }).lean();
    if (freePlan && freePlan.quota && freePlan.quota[field] !== undefined) {
      return freePlan.quota[field];
    }
  } catch (err) {
    console.error(`Error fetching free plan limit for ${field}:`, err.message);
  }
  return defaultValue;
}

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
  try { require('../routes/admin').clearOverviewCache(); } catch {}
  const { sendAdminRealtimeEvent } = require('./notifications');
  sendAdminRealtimeEvent('usage_recorded', { user_id: userId, feature })
    .catch((err) => console.warn('[AdminRealtime] usage_recorded failed:', err.message));
}

// ── Middleware Factories ───────────────────────────────────────────────────────

function requireDocQuota() {
  return async (req, res, next) => {
    try {
      const userId = req.userId;
      const user = await getUser(userId);
      
      const limit = await getUserQuotaLimit(userId, 'max_documents', 3);
      if (limit === -1) return next();

      const { Document } = require('../db/models');
      const total = await Document.countDocuments({ owner_id: userId });
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

      const limit = await getUserQuotaLimit(userId, 'chat_per_day', 30);
      if (limit === -1) return next();

      const used = await usageToday(userId, 'chat_messages');
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
  const limit = await getUserQuotaLimit(userId, 'chat_per_day', 30);
  if (limit === -1) return;
  await recordUsage(userId, 'chat_messages');
}

async function checkAndRecordAiQuota(userId) {
  const limit = await getUserQuotaLimit(userId, 'ai_generations_per_day', 10);
  if (limit === -1) return;

  const used = await usageToday(userId, 'ai_features');
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
  getFreePlanLimit,
  getUserQuotaLimit,
};


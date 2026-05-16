const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { User, UserSubscription, SubscriptionPlan } = require('../db/models');
const { authMiddleware } = require('../middleware/auth');

// ── Helper: Lấy danh sách plans từ DB (có cache ngắn để giảm query) ──────────
let _planCache = null;
let _planCacheAt = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 phút

async function getPlans() {
  const now = Date.now();
  if (_planCache && now - _planCacheAt < CACHE_TTL_MS) return _planCache;
  const result = await SubscriptionPlan.find({ is_active: true })
    .sort({ sort_order: 1 })
    .lean();
  console.log('[plans] DB query result count:', result.length);
  _planCache = result;
  _planCacheAt = now;
  return _planCache;
}

function invalidateCache() {
  _planCache = null;
}

// GET /api/v1/plans  – Lấy danh sách gói
router.get('/', async (_req, res) => {
  try {
    const plans = await getPlans();
    res.json(plans);
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// GET /api/v1/plans/my  – Lấy gói hiện tại của user đang đăng nhập
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const plans = await getPlans();
    const freePlan = plans.find(p => p.id === 'free') || plans[0];

    const sub = await UserSubscription.findOne({ user_id: req.userId }).lean();
    if (!sub) return res.json({ plan: freePlan, subscription: null });

    const plan = plans.find(p => p.id === sub.plan_id) || freePlan;
    const { _id, ...cleanSub } = sub;
    res.json({ plan, subscription: cleanSub });
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// POST /api/v1/plans/subscribe  – Đăng ký / nâng cấp gói (mock payment)
// Body: { plan_id, payment_method }
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { plan_id, payment_method } = req.body;
    const plans = await getPlans();
    const plan = plans.find(p => p.id === plan_id && p.is_active);
    if (!plan) return res.status(400).json({ detail: 'Gói không tồn tại hoặc không khả dụng' });
    if (!['momo', 'vnpay', 'credit_card'].includes(payment_method)) {
      return res.status(400).json({ detail: 'Phương thức thanh toán không hợp lệ' });
    }

    // Tính ngày hết hạn
    let expires_at = null;
    const now = new Date();
    if (plan.billing_cycle === 'monthly') {
      expires_at = new Date(now);
      expires_at.setMonth(expires_at.getMonth() + 1);
    } else if (plan.billing_cycle === 'annual') {
      expires_at = new Date(now);
      expires_at.setFullYear(expires_at.getFullYear() + 1);
    }

    // Upsert UserSubscription
    const existing = await UserSubscription.findOne({ user_id: req.userId });
    if (existing) {
      await UserSubscription.updateOne(
        { user_id: req.userId },
        {
          $set: {
            plan_id: plan.id,
            plan_name: plan.display_name,
            status: 'active',
            payment_method,
            transaction_id: `MOCK_${uuidv4().slice(0, 8).toUpperCase()}`,
            amount_paid_vnd: plan.discounted_price_vnd,
            started_at: now,
            expires_at,
            cancelled_at: null,
            updated_at: now,
          },
        }
      );
    } else {
      await UserSubscription.create({
        id: uuidv4(),
        user_id: req.userId,
        plan_id: plan.id,
        plan_name: plan.display_name,
        status: 'active',
        payment_method,
        transaction_id: `MOCK_${uuidv4().slice(0, 8).toUpperCase()}`,
        amount_paid_vnd: plan.discounted_price_vnd,
        started_at: now,
        expires_at,
        cancelled_at: null,
      });
    }

    // Pro status is now derived from subscription — no need to set is_pro on User

    const updatedSub = await UserSubscription.findOne({ user_id: req.userId }).lean();
    const { _id, ...cleanSub } = updatedSub;
    res.json({ plan, subscription: cleanSub, message: `Đăng ký ${plan.display_name} thành công!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// DELETE /api/v1/plans/cancel  – Hủy gói hiện tại (về free)
router.delete('/cancel', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    await UserSubscription.updateOne(
      { user_id: req.userId },
      { $set: { status: 'cancelled', cancelled_at: now, updated_at: now } }
    );
    // Pro status is now derived from subscription — no need to set is_pro on User
    res.json({ message: 'Đã hủy gói thành công. Bạn đã quay lại gói Miễn phí.' });
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { User, UserSubscription } = require('../db/models');
const { authMiddleware } = require('../middleware/auth');

// ── Dữ liệu gói tĩnh (không cần seed DB) ─────────────────────────────────────
// Thay đổi giá ở đây để cập nhật toàn bộ hệ thống.

const PLANS = [
  {
    id: 'free',
    name: 'free',
    display_name: 'Miễn phí',
    price_vnd: 0,
    price_usd: 0,
    billing_cycle: 'none',
    discount_percent: 0,
    discounted_price_vnd: 0,
    discounted_price_usd: 0,
    is_popular: false,
    is_active: true,
    sort_order: 0,
    quota: {
      chat_per_day: 30,
      ai_generations_per_day: 10,
      max_documents: 3,
      max_file_size_mb: 50,
    },
    features: [
      { icon: 'chat',         text: 'Chat với AI',              included: true,  limit: '30 tin/ngày' },
      { icon: 'auto_awesome', text: 'Tạo nội dung AI',          included: true,  limit: '10 lượt/ngày' },
      { icon: 'upload_file',  text: 'Tài liệu',                 included: true,  limit: 'Tối đa 3 file' },
      { icon: 'hub',          text: 'Sơ đồ tư duy',             included: true,  limit: '10 lượt/ngày' },
      { icon: 'quiz',         text: 'Luyện tập trắc nghiệm',    included: true,  limit: '10 lượt/ngày' },
      { icon: 'support_agent',text: 'Hỗ trợ',                   included: true,  limit: 'Cộng đồng' },
      { icon: 'history',      text: 'Lịch sử hội thoại',        included: false, limit: null },
      { icon: 'priority_high',text: 'Ưu tiên xử lý',            included: false, limit: null },
    ],
  },
  {
    id: 'pro_monthly',
    name: 'pro_monthly',
    display_name: 'Pro Hàng tháng',
    price_vnd: 149000,
    price_usd: 5.99,
    billing_cycle: 'monthly',
    discount_percent: 0,
    discounted_price_vnd: 149000,
    discounted_price_usd: 5.99,
    is_popular: true,
    is_active: true,
    sort_order: 1,
    quota: {
      chat_per_day: -1,
      ai_generations_per_day: -1,
      max_documents: -1,
      max_file_size_mb: 100,
    },
    features: [
      { icon: 'chat',         text: 'Chat với AI',              included: true,  limit: 'Không giới hạn' },
      { icon: 'auto_awesome', text: 'Tạo nội dung AI',          included: true,  limit: 'Không giới hạn' },
      { icon: 'upload_file',  text: 'Tài liệu',                 included: true,  limit: 'Không giới hạn' },
      { icon: 'hub',          text: 'Sơ đồ tư duy',             included: true,  limit: 'Không giới hạn' },
      { icon: 'quiz',         text: 'Luyện tập trắc nghiệm',    included: true,  limit: 'Không giới hạn' },
      { icon: 'support_agent',text: 'Hỗ trợ',                   included: true,  limit: 'Email ưu tiên' },
      { icon: 'history',      text: 'Lịch sử hội thoại',        included: true,  limit: 'Không giới hạn' },
      { icon: 'priority_high',text: 'Ưu tiên xử lý',            included: true,  limit: 'Có' },
    ],
  },
  {
    id: 'pro_annual',
    name: 'pro_annual',
    display_name: 'Pro Hàng năm',
    price_vnd: 298000,   // giá gốc mỗi tháng nếu trả theo năm (không giảm)
    price_usd: 11.99,
    billing_cycle: 'annual',
    discount_percent: 40,
    discounted_price_vnd: 179000,  // 149000 * 12 * 0.6 / 12 ≈ 107.000 → dùng 179k/năm chia 12
    discounted_price_usd: 3.59,
    is_popular: false,
    is_active: true,
    sort_order: 2,
    quota: {
      chat_per_day: -1,
      ai_generations_per_day: -1,
      max_documents: -1,
      max_file_size_mb: 200,
    },
    features: [
      { icon: 'chat',         text: 'Chat với AI',              included: true,  limit: 'Không giới hạn' },
      { icon: 'auto_awesome', text: 'Tạo nội dung AI',          included: true,  limit: 'Không giới hạn' },
      { icon: 'upload_file',  text: 'Tài liệu',                 included: true,  limit: 'Không giới hạn' },
      { icon: 'hub',          text: 'Sơ đồ tư duy',             included: true,  limit: 'Không giới hạn' },
      { icon: 'quiz',         text: 'Luyện tập trắc nghiệm',    included: true,  limit: 'Không giới hạn' },
      { icon: 'support_agent',text: 'Hỗ trợ',                   included: true,  limit: 'Email ưu tiên 24/7' },
      { icon: 'history',      text: 'Lịch sử hội thoại',        included: true,  limit: 'Không giới hạn' },
      { icon: 'priority_high',text: 'Ưu tiên xử lý',            included: true,  limit: 'Cao nhất' },
    ],
  },
];

// GET /api/v1/plans  – Lấy danh sách gói
router.get('/', async (_req, res) => {
  try {
    res.json(PLANS.filter(p => p.is_active).sort((a, b) => a.sort_order - b.sort_order));
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// GET /api/v1/plans/my  – Lấy gói hiện tại của user đang đăng nhập
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const sub = await UserSubscription.findOne({ user_id: req.userId }).lean();
    if (!sub) return res.json({ plan: PLANS[0], subscription: null }); // mặc định free
    const plan = PLANS.find(p => p.id === sub.plan_id) || PLANS[0];
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
    const plan = PLANS.find(p => p.id === plan_id && p.is_active);
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

    // Nếu là gói có trả phí thì set is_pro = true trên User
    const isPro = plan.id !== 'free';
    await User.updateOne({ id: req.userId }, { $set: { is_pro: isPro, updated_at: now } });

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
    await User.updateOne({ id: req.userId }, { $set: { is_pro: false, updated_at: now } });
    res.json({ message: 'Đã hủy gói thành công. Bạn đã quay lại gói Miễn phí.' });
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

module.exports = router;

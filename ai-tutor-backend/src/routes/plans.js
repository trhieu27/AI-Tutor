const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { PayOS } = require('@payos/node');
const { User, UserSubscription, SubscriptionPlan, PaymentTransaction } = require('../db/models');
const { authMiddleware } = require('../middleware/auth');

// ── payOS config ────────────────────────────────────────────────────────────
const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID || 'dummy_client_id',
  apiKey: process.env.PAYOS_API_KEY || 'dummy_api_key',
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || 'dummy_checksum_key'
});

// ── Helper: Lấy danh sách plans từ DB ────────────────────────────────────────
let _planCache = null;
let _planCacheAt = 0;
const CACHE_TTL_MS = 60 * 1000;

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

// ── Pending payments (orderId -> { userId, planId }) ────────────────────────
const pendingPayments = new Map();

// Dọn dẹp pending quá 30 phút
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of pendingPayments) {
    if (now - data.createdAt > 30 * 60 * 1000) {
      pendingPayments.delete(code);
    }
  }
}, 60 * 1000);

// ── Helper: activate subscription ────────────────────────────────────────────
async function activateSubscription(userId, plan, transactionId) {
  const now = new Date();
  let expires_at = null;
  if (plan.billing_cycle === 'monthly') {
    expires_at = new Date(now);
    expires_at.setMonth(expires_at.getMonth() + 1);
  } else if (plan.billing_cycle === 'annual') {
    expires_at = new Date(now);
    expires_at.setFullYear(expires_at.getFullYear() + 1);
  }

  const existing = await UserSubscription.findOne({ user_id: userId });
  if (existing) {
    await UserSubscription.updateOne(
      { user_id: userId },
      {
        $set: {
          plan_id: plan.id,
          plan_name: plan.display_name,
          status: 'active',
          payment_method: 'payos',
          transaction_id: transactionId,
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
      user_id: userId,
      plan_id: plan.id,
      plan_name: plan.display_name,
      status: 'active',
      payment_method: 'payos',
      transaction_id: transactionId,
      amount_paid_vnd: plan.discounted_price_vnd,
      started_at: now,
      expires_at,
      cancelled_at: null,
    });
  }
  if (plan.discounted_price_vnd > 0 && transactionId) {
    const existingTransaction = await PaymentTransaction.findOne({ transaction_id: transactionId });
    if (!existingTransaction) {
      await PaymentTransaction.create({
        id: uuidv4(),
        user_id: userId,
        plan_id: plan.id,
        provider: 'payos',
        transaction_id: transactionId,
        amount_vnd: plan.discounted_price_vnd,
        status: 'paid',
        paid_at: now,
      });
    }
  }
  console.log(`[payOS] ✅ Activated ${plan.id} for user ${userId}, txn: ${transactionId}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/v1/plans  – Lấy danh sách gói
router.get('/', async (_req, res) => {
  try {
    const plans = await getPlans();
    res.json(plans);
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// GET /api/v1/plans/my  – Lấy gói hiện tại của user
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

// POST /api/v1/plans/subscribe  – Tạo link thanh toán payOS
// Body: { plan_id }
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { plan_id } = req.body;
    const plans = await getPlans();
    const plan = plans.find(p => p.id === plan_id && p.is_active);
    if (!plan) return res.status(400).json({ detail: 'Gói không tồn tại hoặc không khả dụng' });

    const amount = plan.discounted_price_vnd || plan.price_vnd;
    if (!amount || amount <= 0) {
      return res.status(400).json({ detail: 'Gói miễn phí không cần thanh toán' });
    }

    // Tạo orderCode duy nhất (payOS yêu cầu số nguyên dương)
    const orderCode = Number(String(Date.now()).slice(-8));

    // Build return/cancel URLs từ request origin
    const origin = req.headers.origin || req.headers.referer?.replace(/\/[^/]*$/, '') || 'http://localhost:3000';
    const returnUrl = `${origin}/pricing?payment=success`;
    const cancelUrl = `${origin}/pricing?payment=cancel`;

    // Tạo payment link qua payOS
    const paymentData = {
      orderCode,
      amount,
      description: `AI Tutor ${plan.display_name}`,
      cancelUrl,
      returnUrl,
    };

    const paymentLink = await payos.paymentRequests.create(paymentData);

    // Tạo QR image URL từ VietQR API
    const qrImageUrl = `https://img.vietqr.io/image/${paymentLink.bin}-${paymentLink.accountNumber}-compact2.png?amount=${paymentLink.amount}&addInfo=${encodeURIComponent(paymentLink.description)}&accountName=${encodeURIComponent(paymentLink.accountName)}`;

    // Lưu pending payment
    pendingPayments.set(orderCode, {
      userId: req.userId,
      planId: plan.id,
      amount,
      createdAt: Date.now(),
    });

    res.json({
      checkout_url: paymentLink.checkoutUrl,
      qr_code: qrImageUrl,
      order_code: orderCode,
      amount,
    });
  } catch (err) {
    console.error('[payOS] Create payment error:', err);
    res.status(500).json({ detail: 'Lỗi tạo thanh toán' });
  }
});

// GET /api/v1/plans/check-payment/:code  – Frontend poll kiểm tra thanh toán
router.get('/check-payment/:code', authMiddleware, async (req, res) => {
  try {
    const code = Number(req.params.code);

    // Kiểm tra trạng thái qua payOS API
    const paymentInfo = await payos.paymentRequests.get(String(code));
    if (paymentInfo.status === 'PAID') {
      // Nếu chưa xử lý, kích hoạt gói
      const pending = pendingPayments.get(code);
      if (pending) {
        const plans = await getPlans();
        const plan = plans.find(p => p.id === pending.planId);
        if (plan) {
          await activateSubscription(pending.userId, plan, `PAYOS_${code}`);
        }
        pendingPayments.delete(code);
      }
      return res.json({ paid: true, message: 'Thanh toán thành công! Gói đã được kích hoạt.' });
    }

    res.json({ paid: false });
  } catch (err) {
    res.json({ paid: false });
  }
});

// POST /api/v1/plans/webhook/payos  – payOS webhook khi thanh toán thành công
router.post('/webhook/payos', async (req, res) => {
  try {
    // Verify webhook data
    const webhookData = payos.webhooks.verify(req.body);
    console.log('[payOS] Webhook received:', webhookData.orderCode, webhookData.code);

    if (webhookData.code === '00') {
      // Thanh toán thành công
      const orderCode = webhookData.orderCode;
      const pending = pendingPayments.get(orderCode);

      if (pending) {
        const plans = await getPlans();
        const plan = plans.find(p => p.id === pending.planId);
        if (plan) {
          await activateSubscription(pending.userId, plan, `PAYOS_${orderCode}`);
        }
        pendingPayments.delete(orderCode);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[payOS] Webhook error:', err);
    res.status(200).json({ success: true }); // Luôn trả 200 để payOS không retry
  }
});

// DELETE /api/v1/plans/cancel  – Hủy gói
router.delete('/cancel', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    await UserSubscription.updateOne(
      { user_id: req.userId },
      { $set: { status: 'cancelled', cancelled_at: now, updated_at: now } }
    );
    res.json({ message: 'Đã hủy gói thành công. Bạn đã quay lại gói Miễn phí.' });
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

module.exports = router;

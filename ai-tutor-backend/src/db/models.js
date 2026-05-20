const mongoose = require('mongoose');
const { presenceOnlineUntil } = require('../utils/presence');

// ── User ──────────────────────────────────────────────────────────────────────

const userPreferencesSchema = new mongoose.Schema({
  email_notifications: { type: Boolean, default: true },
  ai_response_detail: { type: String, default: 'balanced', enum: ['concise', 'balanced', 'detailed'] },
}, { _id: false });

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  student_id: { type: String, required: true },
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  role: { type: String, enum: ['STUDENT', 'ADMIN'], default: 'STUDENT', index: true },
  status: { type: String, enum: ['active', 'blocked', 'deleted'], default: 'active', index: true },
  hashed_password: { type: String, default: '' },
  bio: { type: String, default: null },
  // is_pro removed — Pro status is derived from user_subscriptions collection
  provider: { type: String, default: 'local' },
  preferences: { type: userPreferencesSchema, default: () => ({}) },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});
userSchema.index({ status: 1, created_at: -1 });
userSchema.index({ role: 1, status: 1, created_at: -1 });

// ── User Session ──────────────────────────────────────────────────────────────

const userSessionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  user_id: { type: String, required: true, index: true },
  user_agent: { type: String, default: '' },
  ip_address: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
  last_active: { type: Date, default: Date.now },
  is_online: { type: Boolean, default: true, index: true },
  online_until: { type: Date, default: () => presenceOnlineUntil(), index: true },
});
userSessionSchema.index({ is_online: 1, online_until: 1, user_id: 1 });
userSessionSchema.index({ user_id: 1, last_active: -1 });

// ── Document ──────────────────────────────────────────────────────────────────

const documentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  owner_id: { type: String, required: true, index: true },
  file_name: { type: String, required: true },
  file_size_mb: { type: Number, default: 0 },
  page_count: { type: Number, default: 0 },
  status: { type: String, enum: ['UPLOADING', 'PROCESSING', 'READY', 'FAILED'], default: 'UPLOADING' },
  chroma_collection_id: { type: String, default: null },
  mindmap: { type: String, default: null },
  summary: { type: String, default: null },
  quiz: { type: mongoose.Schema.Types.Mixed, default: null },
  study_questions: { type: [String], default: null },
  uploaded_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});
documentSchema.index({ uploaded_at: -1 });
documentSchema.index({ status: 1, uploaded_at: -1 });
documentSchema.index({ owner_id: 1, uploaded_at: -1 });
documentSchema.index({ owner_id: 1, status: 1, uploaded_at: -1 });

// ── Chat Message ──────────────────────────────────────────────────────────────

const chatMessageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  session_id: { type: String },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  sources: { type: mongoose.Schema.Types.Mixed, default: [] },
  toolExecuted: { type: mongoose.Schema.Types.Mixed, default: null },
  created_at: { type: Date, default: Date.now },
}, { _id: false });

// ── Chat Session ──────────────────────────────────────────────────────────────

const chatSessionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  user_id: { type: String, required: true, index: true },
  document_id: { type: String, required: true, index: true },
  title: { type: String, default: 'Cuộc trò chuyện mới' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  messages: { type: [chatMessageSchema], default: [] },
});
chatSessionSchema.index({ user_id: 1, updated_at: -1 });
chatSessionSchema.index({ document_id: 1, user_id: 1, updated_at: -1 });

// ── OTP ──────────────────────────────────────────────────────────────────────

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  otp: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  expires_at: { type: Date, required: true },
});

// ── Rate Limit ────────────────────────────────────────────────────────────────

const rateLimitSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  attempts: { type: Number, default: 0 },
  last_attempt: { type: Date, default: Date.now },
  locked_until: { type: Date, default: null },
});

// ── Subscription Plan ────────────────────────────────────────────────────────
// Mô tả các gói đăng ký (seed sẵn vào DB hoặc dùng hằng số).

const subscriptionPlanSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },          // 'free' | 'pro_monthly' | 'pro_annual'
  display_name: { type: String, required: true },  // 'Miễn phí' | 'Pro Hàng tháng' | 'Pro Hàng năm'
  price_vnd: { type: Number, default: 0 },          // Giá gốc (VND)
  price_usd: { type: Number, default: 0 },          // Giá gốc (USD)
  billing_cycle: {
    type: String,
    enum: ['none', 'monthly', 'annual'],
    default: 'none',
  },
  // Giảm giá – nếu > 0 thì hiển thị badge.
  discount_percent: { type: Number, default: 0 },   // ví dụ: 40 → 40% OFF
  // Giá sau giảm (tính sẵn để tiện dùng)
  discounted_price_vnd: { type: Number, default: 0 },
  discounted_price_usd: { type: Number, default: 0 },
  // Danh sách tính năng kèm theo gói
  features: [
    {
      icon: { type: String, default: 'check_circle' },
      text: { type: String, required: true },
      included: { type: Boolean, default: true },
    },
  ],
  // Giới hạn quota
  quota: {
    chat_per_day: { type: Number, default: 30 },         // -1 = unlimited
    ai_generations_per_day: { type: Number, default: 10 }, // -1 = unlimited
    max_documents: { type: Number, default: 3 },          // -1 = unlimited
    max_file_size_mb: { type: Number, default: 50 },
  },
  is_active: { type: Boolean, default: true },
  is_popular: { type: Boolean, default: false },     // hiển thị badge "Phổ biến nhất"
  sort_order: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// ── User Subscription ────────────────────────────────────────────────────────
// Lưu trạng thái đăng ký hiện tại của từng người dùng.

const userSubscriptionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  user_id: { type: String, required: true, unique: true, index: true },
  plan_id: { type: String, required: true },         // ref → subscriptionPlan.id
  plan_name: { type: String, required: true },       // snapshot
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'trial'],
    default: 'active',
  },
  // Thông tin thanh toán (mock – chưa tích hợp cổng thật)
  payment_method: { type: String, default: null },   // 'momo' | 'vnpay' | 'credit_card' | null
  transaction_id: { type: String, default: null },
  amount_paid_vnd: { type: Number, default: 0 },
  started_at: { type: Date, default: Date.now },
  expires_at: { type: Date, default: null },          // null = forever (free)
  cancelled_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});
userSubscriptionSchema.index({ status: 1, plan_id: 1, expires_at: 1, user_id: 1 });
userSubscriptionSchema.index({ started_at: -1 });

// ── Usage Log ─────────────────────────────────────────────────────────────────

const usageLogSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  feature: { type: String, required: true },
  date: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});
usageLogSchema.index({ user_id: 1, date: 1 });
usageLogSchema.index({ user_id: 1, date: 1, feature: 1 });
usageLogSchema.index({ date: 1, feature: 1 });

// ── Notification ──────────────────────────────────────────────────────────────

const notificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  user_id: { type: String, required: true, index: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  is_read: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  created_at: { type: String },
});
notificationSchema.index({ user_id: 1, created_at: -1 });

// ── Payment Transaction ──────────────────────────────────────────────────────

const paymentTransactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  user_id: { type: String, required: true, index: true },
  plan_id: { type: String, required: true, index: true },
  provider: { type: String, default: 'unknown' },
  transaction_id: { type: String, default: null, index: true },
  amount_vnd: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'paid',
    index: true,
  },
  paid_at: { type: Date, default: null, index: true },
  created_at: { type: Date, default: Date.now },
});
paymentTransactionSchema.index({ status: 1, paid_at: -1 });

// ── Admin Audit Log ──────────────────────────────────────────────────────────

const adminAuditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  admin_id: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true },
  target_type: { type: String, required: true, index: true },
  target_id: { type: String, default: null, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip_address: { type: String, default: '' },
  created_at: { type: Date, default: Date.now, index: true },
});

// ── Models ────────────────────────────────────────────────────────────────────

const User = mongoose.model('User', userSchema, 'users');
const UserSession = mongoose.model('UserSession', userSessionSchema, 'user_sessions');
const Document = mongoose.model('Document', documentSchema, 'documents');
const ChatSession = mongoose.model('ChatSession', chatSessionSchema, 'chat_sessions');
const OTP = mongoose.model('OTP', otpSchema, 'otps');
const RateLimit = mongoose.model('RateLimit', rateLimitSchema, 'rate_limits');
const UsageLog = mongoose.model('UsageLog', usageLogSchema, 'usage_logs');
const Notification = mongoose.model('Notification', notificationSchema, 'notifications');
const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema, 'subscription_plans');
const UserSubscription = mongoose.model('UserSubscription', userSubscriptionSchema, 'user_subscriptions');
const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema, 'payment_transactions');
const AdminAuditLog = mongoose.model('AdminAuditLog', adminAuditLogSchema, 'admin_audit_logs');

module.exports = {
  User,
  UserSession,
  Document,
  ChatSession,
  OTP,
  RateLimit,
  UsageLog,
  Notification,
  SubscriptionPlan,
  UserSubscription,
  PaymentTransaction,
  AdminAuditLog,
};

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const {
  User,
  UserSession,
  Document,
  ChatSession,
  UsageLog,
  Notification,
  SubscriptionPlan,
  UserSubscription,
  PaymentTransaction,
  AdminAuditLog,
} = require('../db/models');
const { adminMiddleware } = require('../middleware/admin');
const { retryDocumentProcessing, deleteDocumentResources } = require('../utils/documentOps');
const { usageToday } = require('../utils/quota');

const router = express.Router();
router.use(adminMiddleware);

const VALID_ROLES = new Set(['STUDENT', 'ADMIN']);
const VALID_USER_STATUSES = new Set(['active', 'blocked', 'deleted']);
const VALID_PLAN_IDS = new Set(['free', 'pro_monthly', 'pro_annual']);
const VALID_SORTS = new Set(['created_desc', 'created_asc', 'last_active_desc', 'documents_desc', 'ai_today_desc']);
const DANGEROUS_ACTIONS = {
  USER_BLOCKED: 'USER_BLOCKED',
  USER_UNBLOCKED: 'USER_UNBLOCKED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  SUBSCRIPTION_CHANGED: 'SUBSCRIPTION_CHANGED',
  DOCUMENT_RETRIED: 'DOCUMENT_RETRIED',
  DOCUMENT_DELETED: 'DOCUMENT_DELETED',
  PLAN_UPDATED: 'PLAN_UPDATED',
  USER_UPDATED: 'USER_UPDATED',
};

function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || '').toString().split(',')[0].trim();
}

function stripMongo(doc) {
  if (!doc) return null;
  const raw = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  delete raw._id;
  delete raw.__v;
  delete raw.hashed_password;
  return raw;
}

function parsePageLimit(query, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date = new Date()) {
  return new Date(date.getFullYear(), 0, 1);
}

function addGroupKey(date, groupBy) {
  const d = new Date(date);
  if (groupBy === 'year') return String(d.getFullYear());
  if (groupBy === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return d.toISOString().slice(0, 10);
}

function parseDate(value, fallback) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrencyAmount(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function serializeUser(user, extra = {}) {
  const clean = stripMongo(user);
  if (!clean) return null;
  return {
    id: clean.id,
    student_id: clean.student_id || '',
    full_name: clean.full_name || '',
    email: clean.email || '',
    role: clean.role || 'STUDENT',
    status: clean.status || 'active',
    created_at: clean.created_at,
    updated_at: clean.updated_at,
    ...extra,
  };
}

function serializePlan(plan) {
  return stripMongo(plan);
}

function serializeSubscription(sub) {
  return stripMongo(sub);
}

function hasQuiz(doc) {
  if (!doc?.quiz) return false;
  if (Array.isArray(doc.quiz)) return doc.quiz.length > 0;
  return Array.isArray(doc.quiz.items) ? doc.quiz.items.length > 0 : Boolean(doc.quiz);
}

function hasMindmap(doc) {
  return Boolean(String(doc?.mindmap || '').trim());
}

function serializeDocument(doc, owner = null) {
  const clean = stripMongo(doc);
  if (!clean) return null;
  return {
    ...clean,
    owner: owner ? serializeUser(owner) : null,
    has_summary: Boolean(String(clean.summary || '').trim()),
    has_quiz: hasQuiz(clean),
    has_mindmap: hasMindmap(clean),
    has_study_questions: Array.isArray(clean.study_questions) && clean.study_questions.length > 0,
  };
}

async function logAudit(req, action, targetType, targetId, metadata = {}) {
  await AdminAuditLog.create({
    id: uuidv4(),
    admin_id: req.userId,
    action,
    target_type: targetType,
    target_id: targetId || null,
    metadata,
    ip_address: getClientIp(req),
  });
}

async function ensurePaymentTransactionsBackfilled() {
  const subscriptions = await UserSubscription.find({
    amount_paid_vnd: { $gt: 0 },
  }).lean();

  for (const sub of subscriptions) {
    const transactionId = sub.transaction_id || `SUB_${sub.id}`;
    const existing = await PaymentTransaction.findOne({ transaction_id: transactionId }).lean();
    if (existing) continue;

    await PaymentTransaction.create({
      id: uuidv4(),
      user_id: sub.user_id,
      plan_id: sub.plan_id,
      provider: sub.payment_method || 'subscription',
      transaction_id: transactionId,
      amount_vnd: sub.amount_paid_vnd,
      status: 'paid',
      paid_at: sub.started_at || sub.created_at || new Date(),
      created_at: sub.created_at || sub.started_at || new Date(),
    });
  }
}

async function getActiveProSubscriptions() {
  const now = new Date();
  return UserSubscription.find({
    status: 'active',
    plan_id: { $ne: 'free' },
    $or: [{ expires_at: null }, { expires_at: { $gt: now } }],
  }).lean();
}

async function getPlanMap() {
  const plans = await SubscriptionPlan.find({}).lean();
  return new Map(plans.map((plan) => [plan.id, plan]));
}

async function getRevenueTotals() {
  await ensurePaymentTransactionsBackfilled();
  const today = startOfToday();
  const monthStart = startOfMonth();
  const yearStart = startOfYear();

  const [todayRows, monthRows, yearRows] = await Promise.all([
    PaymentTransaction.aggregate([
      { $match: { status: 'paid', paid_at: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$amount_vnd' } } },
    ]),
    PaymentTransaction.aggregate([
      { $match: { status: 'paid', paid_at: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount_vnd' } } },
    ]),
    PaymentTransaction.aggregate([
      { $match: { status: 'paid', paid_at: { $gte: yearStart } } },
      { $group: { _id: null, total: { $sum: '$amount_vnd' } } },
    ]),
  ]);

  return {
    revenueToday: todayRows[0]?.total || 0,
    monthlyRevenue: monthRows[0]?.total || 0,
    yearlyRevenue: yearRows[0]?.total || 0,
  };
}

async function countChatMessagesSince(since, role = null) {
  const match = { 'messages.created_at': { $gte: since } };
  if (role) match['messages.role'] = role;
  const rows = await ChatSession.aggregate([
    { $unwind: '$messages' },
    { $match: match },
    { $count: 'count' },
  ]);
  return rows[0]?.count || 0;
}

async function chatMessagesByUserSince(since, limit = 8) {
  return ChatSession.aggregate([
    { $unwind: '$messages' },
    { $match: { 'messages.role': 'user', 'messages.created_at': { $gte: since } } },
    { $group: { _id: '$user_id', chat_messages: { $sum: 1 } } },
    { $sort: { chat_messages: -1 } },
    { $limit: limit },
  ]);
}

async function getUsageTodayByUser(userIds) {
  const usageRows = await UsageLog.aggregate([
    { $match: { user_id: { $in: userIds }, date: todayUTC() } },
    { $group: { _id: '$user_id', count: { $sum: 1 } } },
  ]);
  return new Map(usageRows.map((row) => [row._id, row.count]));
}

async function getChatTodayByUser(userIds) {
  const rows = await ChatSession.aggregate([
    { $match: { user_id: { $in: userIds } } },
    { $unwind: '$messages' },
    { $match: { 'messages.role': 'user', 'messages.created_at': { $gte: startOfToday() } } },
    { $group: { _id: '$user_id', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id, row.count]));
}

async function getCountsByField(model, field, ids) {
  if (!ids.length) return new Map();
  const rows = await model.aggregate([
    { $match: { [field]: { $in: ids } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id, row.count]));
}

async function getLastActiveByUser(userIds) {
  if (!userIds.length) return new Map();
  const rows = await UserSession.aggregate([
    { $match: { user_id: { $in: userIds } } },
    { $group: { _id: '$user_id', last_active: { $max: '$last_active' } } },
  ]);
  return new Map(rows.map((row) => [row._id, row.last_active]));
}

async function activeAdminCountExcluding(userId) {
  return User.countDocuments({
    id: { $ne: userId },
    role: 'ADMIN',
    $or: [{ status: 'active' }, { status: { $exists: false } }],
  });
}

async function enrichUsers(users) {
  const userIds = users.map((user) => user.id);
  const [subs, documentCounts, chatCounts, lastActive, aiUsageToday, chatToday] = await Promise.all([
    UserSubscription.find({ user_id: { $in: userIds } }).lean(),
    getCountsByField(Document, 'owner_id', userIds),
    getCountsByField(ChatSession, 'user_id', userIds),
    getLastActiveByUser(userIds),
    getUsageTodayByUser(userIds),
    getChatTodayByUser(userIds),
  ]);

  const subMap = new Map(subs.map((sub) => [sub.user_id, sub]));
  const planMap = await getPlanMap();

  return users.map((user) => {
    const sub = subMap.get(user.id);
    const plan = sub ? planMap.get(sub.plan_id) : planMap.get('free');
    return serializeUser(user, {
      plan: plan ? serializePlan(plan) : null,
      subscription: sub ? serializeSubscription(sub) : null,
      document_count: documentCounts.get(user.id) || 0,
      chat_count: chatCounts.get(user.id) || 0,
      ai_usage_today: (aiUsageToday.get(user.id) || 0) + (chatToday.get(user.id) || 0),
      last_active: lastActive.get(user.id) || null,
      is_pro: Boolean(sub && sub.status === 'active' && sub.plan_id !== 'free' && (!sub.expires_at || new Date(sub.expires_at) > new Date())),
    });
  });
}

function userMatchesSearchQuery(search) {
  if (!search) return {};
  const regex = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return { $or: [{ email: regex }, { full_name: regex }, { student_id: regex }] };
}

function sortUsers(users, sort) {
  const chosen = VALID_SORTS.has(sort) ? sort : 'created_desc';
  const sorted = [...users];
  sorted.sort((a, b) => {
    if (chosen === 'created_asc') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    if (chosen === 'last_active_desc') return new Date(b.last_active || 0) - new Date(a.last_active || 0);
    if (chosen === 'documents_desc') return (b.document_count || 0) - (a.document_count || 0);
    if (chosen === 'ai_today_desc') return (b.ai_usage_today || 0) - (a.ai_usage_today || 0);
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
  return sorted;
}

async function buildFeatureUsage() {
  const monthStart = startOfMonth();
  const [chatCount, summaryCount, quizCount, mindmapCount, studyQuestionCount] = await Promise.all([
    countChatMessagesSince(monthStart, 'user'),
    Document.countDocuments({ summary: { $nin: [null, ''] } }),
    Document.countDocuments({ quiz: { $ne: null } }),
    Document.countDocuments({ mindmap: { $nin: [null, ''] } }),
    Document.countDocuments({ 'study_questions.0': { $exists: true } }),
  ]);

  return [
    { id: 'chat', label: 'Hỏi AI', count: chatCount, icon: 'forum' },
    { id: 'summary', label: 'Tóm tắt', count: summaryCount, icon: 'summarize' },
    { id: 'quiz', label: 'Trắc nghiệm', count: quizCount, icon: 'quiz' },
    { id: 'mindmap', label: 'Sơ đồ tư duy', count: mindmapCount, icon: 'account_tree' },
    { id: 'study_questions', label: 'Câu hỏi ôn tập', count: studyQuestionCount, icon: 'help' },
  ].sort((a, b) => b.count - a.count);
}

async function getRecentSubscriptions(limit = 8) {
  const subs = await UserSubscription.find({
    plan_id: { $ne: 'free' },
    status: 'active',
  }).sort({ started_at: -1 }).limit(limit).lean();

  const userMap = new Map((await User.find({ id: { $in: subs.map((sub) => sub.user_id) } }).lean()).map((user) => [user.id, user]));
  const planMap = await getPlanMap();
  return subs.map((sub) => ({
    ...serializeSubscription(sub),
    user: serializeUser(userMap.get(sub.user_id)),
    plan: serializePlan(planMap.get(sub.plan_id)),
  }));
}

async function getAttentionDocuments(limit = 8) {
  const docs = await Document.find({ status: { $in: ['FAILED', 'PROCESSING', 'UPLOADING'] } })
    .sort({ updated_at: -1 })
    .limit(limit)
    .lean();
  const owners = await User.find({ id: { $in: docs.map((doc) => doc.owner_id) } }).lean();
  const ownerMap = new Map(owners.map((user) => [user.id, user]));
  return docs.map((doc) => serializeDocument(doc, ownerMap.get(doc.owner_id)));
}

async function getActiveUsersList(limit = 8, minutes = 15) {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  const sessions = await UserSession.find({ last_active: { $gte: since } }).sort({ last_active: -1 }).limit(limit).lean();
  const users = await User.find({ id: { $in: sessions.map((session) => session.user_id) } }).lean();
  const userMap = new Map(users.map((user) => [user.id, user]));
  const docCounts = await getCountsByField(Document, 'owner_id', sessions.map((session) => session.user_id));
  return sessions.map((session) => ({
    ...stripMongo(session),
    user: serializeUser(userMap.get(session.user_id)),
    document_count: docCounts.get(session.user_id) || 0,
  }));
}

async function buildRevenueSeries(from, to, groupBy) {
  await ensurePaymentTransactionsBackfilled();
  const rows = await PaymentTransaction.find({
    status: 'paid',
    paid_at: { $gte: from, $lte: to },
  }).sort({ paid_at: 1 }).lean();

  const bucketMap = new Map();
  rows.forEach((row) => {
    const key = addGroupKey(row.paid_at || row.created_at, groupBy);
    bucketMap.set(key, (bucketMap.get(key) || 0) + (row.amount_vnd || 0));
  });

  return [...bucketMap.entries()].map(([date, revenue]) => ({ date, revenue }));
}

async function buildOverviewRevenueSeries() {
  return buildRevenueSeries(startOfMonth(), new Date(), 'day');
}

// GET /api/v1/admin/overview
router.get('/overview', async (req, res) => {
  try {
    const today = startOfToday();
    const monthStart = startOfMonth();
    const activeSince = new Date(Date.now() - 15 * 60 * 1000);

    const [
      totalUsers,
      newUsersToday,
      newUsersThisMonth,
      activeRows,
      blockedUsers,
      totalDocuments,
      readyDocuments,
      processingDocuments,
      failedDocuments,
      pageRows,
      totalChatSessions,
      chatMessagesToday,
      aiGenerationsToday,
      activeProSubs,
      revenueTotals,
      featureUsage,
      heavyRows,
      activeUsersList,
      attentionDocuments,
      recentSubscriptions,
      revenueSeries,
    ] = await Promise.all([
      User.countDocuments({ status: { $ne: 'deleted' } }),
      User.countDocuments({ created_at: { $gte: today }, status: { $ne: 'deleted' } }),
      User.countDocuments({ created_at: { $gte: monthStart }, status: { $ne: 'deleted' } }),
      UserSession.aggregate([{ $match: { last_active: { $gte: activeSince } } }, { $group: { _id: '$user_id' } }, { $count: 'count' }]),
      User.countDocuments({ status: 'blocked' }),
      Document.countDocuments({}),
      Document.countDocuments({ status: 'READY' }),
      Document.countDocuments({ status: { $in: ['PROCESSING', 'UPLOADING'] } }),
      Document.countDocuments({ status: 'FAILED' }),
      Document.aggregate([{ $group: { _id: null, total: { $sum: '$page_count' } } }]),
      ChatSession.countDocuments({}),
      countChatMessagesSince(today, 'user'),
      UsageLog.countDocuments({ feature: 'ai_features', date: todayUTC() }),
      getActiveProSubscriptions(),
      getRevenueTotals(),
      buildFeatureUsage(),
      chatMessagesByUserSince(today, 8),
      getActiveUsersList(8, 15),
      getAttentionDocuments(8),
      getRecentSubscriptions(8),
      buildOverviewRevenueSeries(),
    ]);

    const proUserIds = new Set(activeProSubs.map((sub) => sub.user_id));
    const usersForHeavy = await User.find({ id: { $in: heavyRows.map((row) => row._id) } }).lean();
    const heavyUserMap = new Map(usersForHeavy.map((user) => [user.id, user]));
    const topUsedFeature = featureUsage[0] || null;

    const alerts = [
      failedDocuments > 0 ? {
        type: 'failed_documents',
        severity: 'danger',
        title: 'Tài liệu lỗi cần xử lý',
        count: failedDocuments,
      } : null,
      processingDocuments > 0 ? {
        type: 'processing_documents',
        severity: 'warning',
        title: 'Tài liệu đang phân tích',
        count: processingDocuments,
      } : null,
      blockedUsers > 0 ? {
        type: 'blocked_users',
        severity: 'info',
        title: 'Tài khoản đang bị khóa',
        count: blockedUsers,
      } : null,
    ].filter(Boolean);

    res.json({
      totalUsers,
      newUsersToday,
      newUsersThisMonth,
      activeUsers: activeRows[0]?.count || 0,
      proUsers: proUserIds.size,
      freeUsers: Math.max(totalUsers - proUserIds.size, 0),
      blockedUsers,
      totalDocuments,
      readyDocuments,
      processingDocuments,
      failedDocuments,
      totalPages: pageRows[0]?.total || 0,
      totalChatSessions,
      chatMessagesToday,
      aiGenerationsToday,
      monthlyRevenue: revenueTotals.monthlyRevenue,
      yearlyRevenue: revenueTotals.yearlyRevenue,
      revenueToday: revenueTotals.revenueToday,
      freeToProConversionRate: totalUsers ? Math.round((proUserIds.size / totalUsers) * 1000) / 10 : 0,
      topUsedFeature,
      featureUsage,
      revenueSeries,
      heavyAiUsers: heavyRows.map((row) => ({
        user: serializeUser(heavyUserMap.get(row._id)),
        chat_messages: row.chat_messages,
      })),
      activeUsersList,
      attentionDocuments,
      recentSubscriptions,
      alerts,
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ detail: 'Lỗi tải tổng quan admin' });
  }
});

// GET /api/v1/admin/users
router.get('/users', async (req, res) => {
  try {
    const { page, limit } = parsePageLimit(req.query);
    const query = { ...userMatchesSearchQuery(req.query.search) };
    if (req.query.role && VALID_ROLES.has(req.query.role)) query.role = req.query.role;
    if (req.query.status && VALID_USER_STATUSES.has(req.query.status)) query.status = req.query.status;
    else query.status = { $ne: 'deleted' };

    const users = await User.find(query).lean();
    let enriched = await enrichUsers(users);

    if (req.query.plan) {
      const plan = String(req.query.plan);
      enriched = enriched.filter((user) => {
        if (plan === 'pro') return user.is_pro;
        if (plan === 'free') return !user.is_pro;
        return user.subscription?.plan_id === plan;
      });
    }

    if (req.query.active === 'true' || req.query.active === 'false') {
      const since = new Date(Date.now() - 15 * 60 * 1000);
      enriched = enriched.filter((user) => {
        const isActive = user.last_active && new Date(user.last_active) >= since;
        return req.query.active === 'true' ? isActive : !isActive;
      });
    }

    enriched = sortUsers(enriched, req.query.sort);
    const total = enriched.length;
    const items = enriched.slice((page - 1) * limit, page * limit);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ detail: 'Lỗi tải danh sách người dùng' });
  }
});

// GET /api/v1/admin/users/:id
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.id }).lean();
    if (!user) return res.status(404).json({ detail: 'Người dùng không tồn tại' });

    const [subscription, docs, sessions, chatCount, usageLogs, recentUsage, chatUsed, aiUsed, docCount] = await Promise.all([
      UserSubscription.findOne({ user_id: user.id }).lean(),
      Document.find({ owner_id: user.id }).sort({ uploaded_at: -1 }).limit(30).lean(),
      UserSession.find({ user_id: user.id }).sort({ last_active: -1 }).limit(20).lean(),
      ChatSession.countDocuments({ user_id: user.id }),
      UsageLog.find({ user_id: user.id }).sort({ created_at: -1 }).limit(40).lean(),
      UsageLog.find({ user_id: user.id }).sort({ created_at: -1 }).limit(10).lean(),
      usageToday(user.id, 'chat_messages'),
      usageToday(user.id, 'ai_features'),
      Document.countDocuments({ owner_id: user.id }),
    ]);

    const planMap = await getPlanMap();
    const plan = subscription ? planMap.get(subscription.plan_id) : planMap.get('free');
    const owner = serializeUser(user);

    res.json({
      user: serializeUser(user, {
        is_pro: Boolean(subscription && subscription.status === 'active' && subscription.plan_id !== 'free' && (!subscription.expires_at || new Date(subscription.expires_at) > new Date())),
      }),
      subscription: subscription ? serializeSubscription(subscription) : null,
      plan: plan ? serializePlan(plan) : null,
      quotaUsage: {
        documents: docCount,
        chat_messages: chatUsed,
        ai_generations: aiUsed,
        limits: plan?.quota || null,
      },
      documents: docs.map((doc) => serializeDocument(doc, owner)),
      sessions: sessions.map(stripMongo),
      chat_sessions_count: chatCount,
      usage_logs: usageLogs.map(stripMongo),
      recent_activity: [
        ...recentUsage.map((log) => ({ type: 'usage', at: log.created_at, feature: log.feature, date: log.date })),
        ...sessions.slice(0, 5).map((session) => ({ type: 'session', at: session.last_active, session_id: session.id })),
        ...docs.slice(0, 5).map((doc) => ({ type: 'document', at: doc.uploaded_at, document_id: doc.id, status: doc.status })),
      ].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0)).slice(0, 15),
    });
  } catch (err) {
    console.error('Admin user detail error:', err);
    res.status(500).json({ detail: 'Lỗi tải chi tiết người dùng' });
  }
});

// PATCH /api/v1/admin/users/:id
router.patch('/users/:id', async (req, res) => {
  try {
    const target = await User.findOne({ id: req.params.id });
    if (!target) return res.status(404).json({ detail: 'Người dùng không tồn tại' });

    const updates = { updated_at: new Date() };
    const changed = {};

    if (req.body.role !== undefined) {
      if (!VALID_ROLES.has(req.body.role)) return res.status(400).json({ detail: 'Role không hợp lệ' });
      updates.role = req.body.role;
      changed.role = { from: target.role, to: req.body.role };
    }

    if (req.body.status !== undefined) {
      if (!VALID_USER_STATUSES.has(req.body.status)) return res.status(400).json({ detail: 'Trạng thái không hợp lệ' });
      if (target.id === req.userId && req.body.status !== 'active') {
        return res.status(400).json({ detail: 'Admin không thể khóa chính mình' });
      }
      updates.status = req.body.status;
      changed.status = { from: target.status, to: req.body.status };
    }

    if (req.body.full_name !== undefined) {
      const fullName = String(req.body.full_name).trim();
      if (!fullName || fullName.length > 120) return res.status(400).json({ detail: 'Tên người dùng không hợp lệ' });
      updates.full_name = fullName;
      changed.full_name = { from: target.full_name, to: fullName };
    }

    if (req.body.student_id !== undefined) {
      const studentId = String(req.body.student_id).trim();
      if (!studentId || studentId.length > 40) return res.status(400).json({ detail: 'MSSV không hợp lệ' });
      updates.student_id = studentId;
      changed.student_id = { from: target.student_id, to: studentId };
    }

    const currentRole = target.role || 'STUDENT';
    const currentStatus = target.status || 'active';
    const nextRole = updates.role || currentRole;
    const nextStatus = updates.status || currentStatus;
    if (currentRole === 'ADMIN' && currentStatus === 'active' && (nextRole !== 'ADMIN' || nextStatus !== 'active')) {
      const remainingAdmins = await activeAdminCountExcluding(target.id);
      if (remainingAdmins < 1) {
        return res.status(400).json({ detail: 'Không thể gỡ hoặc khóa admin hoạt động cuối cùng' });
      }
    }

    if (Object.keys(changed).length === 0) {
      return res.status(400).json({ detail: 'Không có trường hợp lệ để cập nhật' });
    }

    await User.updateOne({ id: target.id }, { $set: updates });
    const updated = await User.findOne({ id: target.id }).lean();

    if (changed.status?.to === 'blocked') await logAudit(req, DANGEROUS_ACTIONS.USER_BLOCKED, 'user', target.id, changed);
    else if (changed.status?.from === 'blocked' && changed.status?.to === 'active') await logAudit(req, DANGEROUS_ACTIONS.USER_UNBLOCKED, 'user', target.id, changed);
    if (changed.role) await logAudit(req, DANGEROUS_ACTIONS.USER_ROLE_CHANGED, 'user', target.id, changed);
    if (!changed.role && !changed.status) await logAudit(req, DANGEROUS_ACTIONS.USER_UPDATED, 'user', target.id, changed);

    res.json(serializeUser(updated));
  } catch (err) {
    console.error('Admin update user error:', err);
    res.status(500).json({ detail: 'Lỗi cập nhật người dùng' });
  }
});

// POST /api/v1/admin/users/:id/subscription
router.post('/users/:id/subscription', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.id }).lean();
    if (!user) return res.status(404).json({ detail: 'Người dùng không tồn tại' });

    const planId = String(req.body.plan_id || '');
    if (!VALID_PLAN_IDS.has(planId)) return res.status(400).json({ detail: 'Gói dịch vụ không hợp lệ' });

    const plan = await SubscriptionPlan.findOne({ id: planId }).lean();
    if (!plan) return res.status(400).json({ detail: 'Gói dịch vụ chưa được cấu hình' });

    let expiresAt = null;
    if (req.body.expires_at) {
      expiresAt = new Date(req.body.expires_at);
      if (Number.isNaN(expiresAt.getTime())) return res.status(400).json({ detail: 'Ngày hết hạn không hợp lệ' });
    } else if (plan.billing_cycle === 'monthly') {
      expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else if (plan.billing_cycle === 'annual') {
      expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    const now = new Date();
    const payload = {
      plan_id: plan.id,
      plan_name: plan.display_name,
      status: 'active',
      payment_method: 'admin',
      transaction_id: null,
      amount_paid_vnd: 0,
      started_at: now,
      expires_at: expiresAt,
      cancelled_at: null,
      updated_at: now,
    };

    const subscription = await UserSubscription.findOneAndUpdate(
      { user_id: user.id },
      { $set: payload, $setOnInsert: { id: uuidv4(), user_id: user.id, created_at: now } },
      { upsert: true, new: true }
    ).lean();

    await logAudit(req, DANGEROUS_ACTIONS.SUBSCRIPTION_CHANGED, 'user', user.id, {
      plan_id: plan.id,
      expires_at: expiresAt,
    });

    res.json({ subscription: serializeSubscription(subscription), plan: serializePlan(plan) });
  } catch (err) {
    console.error('Admin subscription error:', err);
    res.status(500).json({ detail: 'Lỗi cập nhật gói người dùng' });
  }
});

// GET /api/v1/admin/revenue
router.get('/revenue', async (req, res) => {
  try {
    const now = new Date();
    const from = parseDate(req.query.from, startOfYear(now));
    const to = parseDate(req.query.to, now);
    to.setHours(23, 59, 59, 999);
    const groupBy = ['day', 'month', 'year'].includes(req.query.groupBy) ? req.query.groupBy : 'month';

    await ensurePaymentTransactionsBackfilled();
    const transactions = await PaymentTransaction.find({
      status: 'paid',
      paid_at: { $gte: from, $lte: to },
    }).sort({ paid_at: -1 }).lean();

    const planMap = await getPlanMap();
    const users = await User.find({ id: { $in: transactions.map((tx) => tx.user_id) } }).lean();
    const userMap = new Map(users.map((user) => [user.id, user]));

    const totalRevenue = transactions.reduce((sum, tx) => sum + formatCurrencyAmount(tx.amount_vnd), 0);
    const monthlyPlanRevenue = transactions
      .filter((tx) => planMap.get(tx.plan_id)?.billing_cycle === 'monthly')
      .reduce((sum, tx) => sum + formatCurrencyAmount(tx.amount_vnd), 0);
    const annualPlanRevenue = transactions
      .filter((tx) => planMap.get(tx.plan_id)?.billing_cycle === 'annual')
      .reduce((sum, tx) => sum + formatCurrencyAmount(tx.amount_vnd), 0);

    const planBreakdownMap = new Map();
    transactions.forEach((tx) => {
      const current = planBreakdownMap.get(tx.plan_id) || { plan_id: tx.plan_id, revenue: 0, count: 0 };
      current.revenue += formatCurrencyAmount(tx.amount_vnd);
      current.count += 1;
      planBreakdownMap.set(tx.plan_id, current);
    });

    const [totalUsers, activeProSubs, upgradedThisMonth] = await Promise.all([
      User.countDocuments({ status: { $ne: 'deleted' } }),
      getActiveProSubscriptions(),
      UserSubscription.countDocuments({ plan_id: { $ne: 'free' }, started_at: { $gte: startOfMonth(now) } }),
    ]);

    const revenueTotals = await getRevenueTotals();

    res.json({
      totalRevenue,
      monthlyRevenue: revenueTotals.monthlyRevenue,
      yearlyRevenue: revenueTotals.yearlyRevenue,
      monthlyPlanRevenue,
      annualPlanRevenue,
      revenueSeries: await buildRevenueSeries(from, to, groupBy),
      transactions: transactions.slice(0, 50).map((tx) => ({
        ...stripMongo(tx),
        user: serializeUser(userMap.get(tx.user_id)),
        plan: serializePlan(planMap.get(tx.plan_id)),
      })),
      planBreakdown: [...planBreakdownMap.values()].map((item) => ({
        ...item,
        plan: serializePlan(planMap.get(item.plan_id)),
      })),
      conversionStats: {
        totalUsers,
        proUsers: activeProSubs.length,
        freeUsers: Math.max(totalUsers - activeProSubs.length, 0),
        upgradedThisMonth,
        freeToProConversionRate: totalUsers ? Math.round((activeProSubs.length / totalUsers) * 1000) / 10 : 0,
      },
    });
  } catch (err) {
    console.error('Admin revenue error:', err);
    res.status(500).json({ detail: 'Lỗi tải doanh thu' });
  }
});

// GET /api/v1/admin/activity
router.get('/activity', async (req, res) => {
  try {
    const activeWithinMinutes = Math.max(1, Number.parseInt(req.query.activeWithinMinutes, 10) || 15);
    const { page, limit, skip } = parsePageLimit(req.query);
    const since = new Date(Date.now() - activeWithinMinutes * 60 * 1000);

    const [total, sessions] = await Promise.all([
      UserSession.countDocuments({ last_active: { $gte: since } }),
      UserSession.find({ last_active: { $gte: since } }).sort({ last_active: -1 }).skip(skip).limit(limit).lean(),
    ]);

    const userIds = sessions.map((session) => session.user_id);
    const users = await User.find({ id: { $in: userIds } }).lean();
    const userMap = new Map(users.map((user) => [user.id, user]));
    const documentCounts = await getCountsByField(Document, 'owner_id', userIds);
    const usageRows = await UsageLog.aggregate([
      { $match: { user_id: { $in: userIds }, created_at: { $gte: since } } },
      { $group: { _id: '$user_id', count: { $sum: 1 } } },
    ]);
    const usageMap = new Map(usageRows.map((row) => [row._id, row.count]));

    res.json({
      items: sessions.map((session) => ({
        ...stripMongo(session),
        user: serializeUser(userMap.get(session.user_id)),
        document_count: documentCounts.get(session.user_id) || 0,
        recent_usage_count: usageMap.get(session.user_id) || 0,
      })),
      activeWithinMinutes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error('Admin activity error:', err);
    res.status(500).json({ detail: 'Lỗi tải hoạt động' });
  }
});

// GET /api/v1/admin/documents
router.get('/documents', async (req, res) => {
  try {
    const { page, limit } = parsePageLimit(req.query);
    const query = {};
    if (req.query.status) query.status = String(req.query.status).toUpperCase();
    if (req.query.owner) query.owner_id = String(req.query.owner);
    if (req.query.from || req.query.to) {
      query.uploaded_at = {};
      if (req.query.from) query.uploaded_at.$gte = parseDate(req.query.from, null);
      if (req.query.to) query.uploaded_at.$lte = parseDate(req.query.to, null);
    }

    let docs = await Document.find(query).sort({ uploaded_at: -1 }).lean();
    const owners = await User.find({ id: { $in: docs.map((doc) => doc.owner_id) } }).lean();
    const ownerMap = new Map(owners.map((user) => [user.id, user]));

    if (req.query.search) {
      const search = String(req.query.search).toLowerCase();
      docs = docs.filter((doc) => {
        const owner = ownerMap.get(doc.owner_id);
        return [
          doc.file_name,
          owner?.email,
          owner?.full_name,
          owner?.student_id,
        ].some((value) => String(value || '').toLowerCase().includes(search));
      });
    }

    const total = docs.length;
    const items = docs.slice((page - 1) * limit, page * limit).map((doc) => serializeDocument(doc, ownerMap.get(doc.owner_id)));

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error('Admin documents error:', err);
    res.status(500).json({ detail: 'Lỗi tải tài liệu' });
  }
});

// POST /api/v1/admin/documents/:id/retry
router.post('/documents/:id/retry', async (req, res) => {
  try {
    const doc = await retryDocumentProcessing(req.params.id);
    await logAudit(req, DANGEROUS_ACTIONS.DOCUMENT_RETRIED, 'document', req.params.id, {
      owner_id: doc?.owner_id,
      file_name: doc?.file_name,
    });
    res.json(serializeDocument(doc));
  } catch (err) {
    res.status(err.statusCode || 500).json({ detail: err.message || 'Lỗi xử lý lại tài liệu' });
  }
});

// DELETE /api/v1/admin/documents/:id
router.delete('/documents/:id', async (req, res) => {
  try {
    const doc = await deleteDocumentResources(req.params.id);
    await logAudit(req, DANGEROUS_ACTIONS.DOCUMENT_DELETED, 'document', req.params.id, {
      owner_id: doc.owner_id,
      file_name: doc.file_name,
      status: doc.status,
    });
    res.status(204).send();
  } catch (err) {
    res.status(err.statusCode || 500).json({ detail: err.message || 'Lỗi xóa tài liệu' });
  }
});

// GET /api/v1/admin/plans
router.get('/plans', async (_req, res) => {
  try {
    const plans = await SubscriptionPlan.find({}).sort({ sort_order: 1 }).lean();
    res.json(plans.map(serializePlan));
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi tải gói dịch vụ' });
  }
});

function validateNumber(value, field, { min = 0, integer = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || (integer && !Number.isInteger(number))) {
    const err = new Error(`${field} không hợp lệ`);
    err.statusCode = 400;
    throw err;
  }
  return number;
}

// PATCH /api/v1/admin/plans/:id
router.patch('/plans/:id', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findOne({ id: req.params.id });
    if (!plan) return res.status(404).json({ detail: 'Gói dịch vụ không tồn tại' });

    const updates = { updated_at: new Date() };
    const allowedStringFields = ['display_name'];
    allowedStringFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        const value = String(req.body[field]).trim();
        if (!value || value.length > 120) {
          const err = new Error(`${field} không hợp lệ`);
          err.statusCode = 400;
          throw err;
        }
        updates[field] = value;
      }
    });

    ['price_vnd', 'discounted_price_vnd'].forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = validateNumber(req.body[field], field, { min: 0, integer: true });
    });
    if (req.body.discount_percent !== undefined) updates.discount_percent = validateNumber(req.body.discount_percent, 'discount_percent', { min: 0, integer: true });
    if (req.body.sort_order !== undefined) updates.sort_order = validateNumber(req.body.sort_order, 'sort_order', { min: 0, integer: true });
    ['is_active', 'is_popular'].forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = Boolean(req.body[field]);
    });

    if (req.body.quota !== undefined) {
      const quota = req.body.quota || {};
      const quotaUpdates = {};
      ['chat_per_day', 'ai_generations_per_day', 'max_documents', 'max_file_size_mb'].forEach((field) => {
        if (quota[field] !== undefined) quotaUpdates[`quota.${field}`] = validateNumber(quota[field], `quota.${field}`, { min: -1, integer: true });
      });
      Object.assign(updates, quotaUpdates);
    }

    await SubscriptionPlan.updateOne({ id: plan.id }, { $set: updates });
    const updated = await SubscriptionPlan.findOne({ id: plan.id }).lean();
    await logAudit(req, DANGEROUS_ACTIONS.PLAN_UPDATED, 'plan', plan.id, updates);
    res.json(serializePlan(updated));
  } catch (err) {
    res.status(err.statusCode || 500).json({ detail: err.message || 'Lỗi cập nhật gói dịch vụ' });
  }
});

// GET /api/v1/admin/audit
router.get('/audit', async (req, res) => {
  try {
    const { page, limit, skip } = parsePageLimit(req.query);
    const query = {};
    if (req.query.admin_id) query.admin_id = String(req.query.admin_id);
    if (req.query.action) query.action = String(req.query.action);
    if (req.query.target_type) query.target_type = String(req.query.target_type);
    if (req.query.from || req.query.to) {
      query.created_at = {};
      if (req.query.from) query.created_at.$gte = parseDate(req.query.from, null);
      if (req.query.to) query.created_at.$lte = parseDate(req.query.to, null);
    }

    const [total, logs] = await Promise.all([
      AdminAuditLog.countDocuments(query),
      AdminAuditLog.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
    ]);

    const admins = await User.find({ id: { $in: logs.map((log) => log.admin_id) } }).lean();
    const adminMap = new Map(admins.map((admin) => [admin.id, admin]));

    res.json({
      items: logs.map((log) => ({
        ...stripMongo(log),
        admin: serializeUser(adminMap.get(log.admin_id)),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi tải nhật ký admin' });
  }
});

module.exports = router;

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
const { parsePagination } = require('../utils/pagination');
const { usageToday } = require('../utils/quota');
const { refreshConnections } = require('../db/mongoose');
const { sendAdminRealtimeEvent, notificationManager } = require('../utils/notifications');

const router = express.Router();
router.use(adminMiddleware);

const VALID_ROLES = new Set(['STUDENT', 'ADMIN']);
const VALID_USER_STATUSES = new Set(['active', 'blocked', 'deleted']);
const VALID_PLAN_IDS = new Set(['free', 'pro_monthly', 'pro_annual']);
const VALID_SORTS = new Set(['created_desc', 'created_asc', 'last_active_desc', 'documents_desc', 'ai_today_desc']);
const DEFAULT_ACTIVITY_WINDOW_MINUTES = 15;
const USER_LIST_PROJECTION = 'id student_id full_name email role status created_at updated_at';
const DOCUMENT_LIST_PROJECTION = 'id owner_id file_name file_size_mb page_count status uploaded_at updated_at';
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

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Vietnamese diacritics-insensitive search
const VIET_MAP = {
  a: '[aàáảãạăằắẳẵặâầấẩẫậ]',
  e: '[eèéẻẽẹêềếểễệ]',
  i: '[iìíỉĩị]',
  o: '[oòóỏõọôồốổỗộơờớởỡợ]',
  u: '[uùúủũụưừứửữự]',
  y: '[yỳýỷỹỵ]',
  d: '[dđ]',
};

function removeDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd');
}

function buildVietnameseRegex(input) {
  const normalized = removeDiacritics(String(input).trim()).toLowerCase();
  let pattern = '';
  for (const ch of normalized) {
    pattern += VIET_MAP[ch] || escapeRegex(ch);
  }
  return new RegExp(pattern, 'i');
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
  return parsePagination(query, { defaultLimit, maxLimit });
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

function serializeDocumentListItem(doc, owner = null) {
  const clean = stripMongo(doc);
  if (!clean) return null;
  return {
    id: clean.id,
    owner_id: clean.owner_id,
    file_name: clean.file_name,
    file_size_mb: clean.file_size_mb || 0,
    page_count: clean.page_count || 0,
    status: clean.status || 'UPLOADING',
    uploaded_at: clean.uploaded_at,
    updated_at: clean.updated_at,
    owner: owner ? serializeUser(owner) : null,
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
  if (subscriptions.length === 0) return;

  const transactionIds = subscriptions.map((sub) => sub.transaction_id || `SUB_${sub.id}`);
  const existingTxs = await PaymentTransaction.find({ transaction_id: { $in: transactionIds } }).select('transaction_id').lean();
  const existingSet = new Set(existingTxs.map((tx) => tx.transaction_id));

  const newTxs = [];
  for (const sub of subscriptions) {
    const transactionId = sub.transaction_id || `SUB_${sub.id}`;
    if (existingSet.has(transactionId)) continue;

    newTxs.push({
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

  if (newTxs.length > 0) {
    await PaymentTransaction.insertMany(newTxs);
  }
}

async function countActiveProSubscriptions(extra = {}) {
  const now = new Date();
  return UserSubscription.countDocuments({
    ...extra,
    status: 'active',
    plan_id: { $ne: 'free' },
    $or: [{ expires_at: null }, { expires_at: { $gt: now } }],
  });
}

async function getPlanMap() {
  const plans = await SubscriptionPlan.find({}).lean();
  return new Map(plans.map((plan) => [plan.id, plan]));
}

async function getRevenueTotals() {
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
  const initialMatch = { 'messages.created_at': { $gte: since } };
  const exactMatch = { 'messages.created_at': { $gte: since } };
  if (role) {
    initialMatch['messages.role'] = role;
    exactMatch['messages.role'] = role;
  }
  const rows = await ChatSession.aggregate([
    { $match: initialMatch },
    { $unwind: '$messages' },
    { $match: exactMatch },
    { $count: 'count' },
  ]);
  return rows[0]?.count || 0;
}

async function chatMessagesByUserSince(since, limit = 8) {
  return ChatSession.aggregate([
    { $match: { 'messages.role': 'user', 'messages.created_at': { $gte: since } } },
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

async function getPresenceByUser(userIds) {
  if (!userIds.length) return new Map();
  const now = new Date();
  const rows = await UserSession.aggregate([
    { $match: { user_id: { $in: userIds } } },
    {
      $group: {
        _id: '$user_id',
        last_active: { $max: '$last_active' },
        online_until: { $max: '$online_until' },
        online_sessions: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$is_online', true] }, { $gt: ['$online_until', now] }] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
  return new Map(rows.map((row) => [row._id, row]));
}

function getOnlineUserIds() {
  return notificationManager.getOnlineUserIds();
}

async function getUserIdConstraintForPlan(plan) {
  if (!plan) return null;
  const now = new Date();
  const activeProQuery = {
    status: 'active',
    plan_id: { $ne: 'free' },
    $or: [{ expires_at: null }, { expires_at: { $gt: now } }],
  };

  if (plan === 'pro') {
    return { $in: await UserSubscription.distinct('user_id', activeProQuery) };
  }

  if (plan === 'free') {
    return { $nin: await UserSubscription.distinct('user_id', activeProQuery) };
  }

  if (plan === 'pro_monthly' || plan === 'pro_annual') {
    const activeSpecificPlanQuery = {
      status: 'active',
      plan_id: plan,
      $or: [{ expires_at: null }, { expires_at: { $gt: now } }],
    };
    return { $in: await UserSubscription.distinct('user_id', activeSpecificPlanQuery) };
  }

  return { $in: [] };
}

async function buildUserListQuery(req, { includeSearch = true } = {}) {
  const searchQuery = userMatchesSearchQuery(req.query.search);
  const query = includeSearch ? { ...searchQuery } : {};
  const idConstraints = [];

  if (req.query.role && VALID_ROLES.has(req.query.role)) {
    if (req.query.role === 'STUDENT') {
      query.role = { $in: ['STUDENT', null] };
    } else {
      query.role = req.query.role;
    }
  } else {
    // Exclude admins by default
    query.role = { $in: ['STUDENT', null] };
  }
  if (req.query.status && VALID_USER_STATUSES.has(req.query.status)) {
    if (req.query.status === 'active') {
      query.status = { $in: ['active', null] };
    } else {
      query.status = req.query.status;
    }
  } else {
    query.status = { $ne: 'deleted' };
  }

  const planConstraint = await getUserIdConstraintForPlan(String(req.query.plan || ''));
  if (planConstraint) idConstraints.push({ id: planConstraint });

  if (req.query.active === 'true' || req.query.active === 'false') {
    const onlineUserIds = await getOnlineUserIds();
    idConstraints.push({ id: req.query.active === 'true' ? { $in: onlineUserIds } : { $nin: onlineUserIds } });
  }

  if (idConstraints.length) query.$and = idConstraints;
  return { query };
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
  const [subs, documentCounts, chatCounts, aiUsageToday, chatToday] = await Promise.all([
    UserSubscription.find({ user_id: { $in: userIds } }).lean(),
    getCountsByField(Document, 'owner_id', userIds),
    getCountsByField(ChatSession, 'user_id', userIds),
    getUsageTodayByUser(userIds),
    getChatTodayByUser(userIds),
  ]);

  const subMap = new Map(subs.map((sub) => [sub.user_id, sub]));
  const planMap = await getPlanMap();

  return users.map((user) => {
    const sub = subMap.get(user.id);
    const isPro = Boolean(sub && sub.status === 'active' && sub.plan_id !== 'free' && (!sub.expires_at || new Date(sub.expires_at) > new Date()));
    const plan = isPro ? planMap.get(sub.plan_id) : planMap.get('free');
    return {
      id: user.id,
      student_id: user.student_id || '',
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role || 'STUDENT',
      status: user.status || 'active',
      plan: plan ? serializePlan(plan) : null,
      document_count: documentCounts.get(user.id) || 0,
      chat_count: chatCounts.get(user.id) || 0,
      ai_usage_today: (aiUsageToday.get(user.id) || 0) + (chatToday.get(user.id) || 0),
    };
  });
}

function userMatchesSearchQuery(search) {
  if (!search) return {};
  const regex = buildVietnameseRegex(search);
  return { $or: [{ email: regex }, { full_name: regex }, { student_id: regex }] };
}

function sortUsers(users, sort) {
  const chosen = VALID_SORTS.has(sort) ? sort : 'created_desc';
  const sorted = [...users];
  sorted.sort((a, b) => {
    if (Boolean(a.is_online) !== Boolean(b.is_online)) return a.is_online ? -1 : 1;
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
    .select(DOCUMENT_LIST_PROJECTION)
    .sort({ updated_at: -1 })
    .limit(limit)
    .lean();
  const owners = await User.find({ id: { $in: docs.map((doc) => doc.owner_id) } }).select(USER_LIST_PROJECTION).lean();
  const ownerMap = new Map(owners.map((user) => [user.id, user]));
  return docs.map((doc) => serializeDocumentListItem(doc, ownerMap.get(doc.owner_id)));
}

async function getActiveUsersList(limit = 8, excludeIds = []) {
  const onlineIds = getOnlineUserIds().filter((id) => !excludeIds.includes(id)).slice(0, limit);
  if (!onlineIds.length) return [];
  const users = await User.find({ id: { $in: onlineIds } }).lean();
  const docCounts = await getCountsByField(Document, 'owner_id', onlineIds);
  return users.map((user) => ({
    user: serializeUser(user),
    document_count: docCounts.get(user.id) || 0,
  }));
}

async function buildRevenueSeries(from, to, groupBy) {
  const rows = await PaymentTransaction.find({
    status: 'paid',
    paid_at: { $gte: from, $lte: to },
  }).sort({ paid_at: 1 }).lean();

  const bucketMap = new Map();

  // Pre-populate with all keys between from and to
  let current = new Date(from);
  const end = new Date(to);
  while (current <= end) {
    const key = addGroupKey(current, groupBy);
    bucketMap.set(key, { revenue: 0, count: 0 });

    if (groupBy === 'year') {
      current.setFullYear(current.getFullYear() + 1);
    } else if (groupBy === 'month') {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setDate(current.getDate() + 1);
    }
  }
  const endKey = addGroupKey(end, groupBy);
  if (!bucketMap.has(endKey)) {
    bucketMap.set(endKey, { revenue: 0, count: 0 });
  }

  rows.forEach((row) => {
    const key = addGroupKey(row.paid_at || row.created_at, groupBy);
    const bucket = bucketMap.get(key) || { revenue: 0, count: 0 };
    bucket.revenue += (row.amount_vnd || 0);
    bucket.count += 1;
    bucketMap.set(key, bucket);
  });

  return [...bucketMap.entries()].map(([date, { revenue, count }]) => ({ date, revenue, count }));
}

async function buildOverviewRevenueSeries() {
  return buildRevenueSeries(startOfMonth(), new Date(), 'day');
}

let overviewCache = null;
let overviewCacheTime = 0;
let overviewInFlight = null;
let overviewFailureUntil = 0;
const OVERVIEW_CACHE_TTL = 30000; // 30 seconds
const OVERVIEW_FAILURE_COOLDOWN = 30000; // 30 seconds
const overviewFallback = buildFallbackOverview();

function clearOverviewCache() {
  overviewCache = null;
  overviewCacheTime = 0;
}

function buildFallbackOverview() {
  return {
    totalUsers: 0,
    newUsersToday: 0,
    newUsersThisMonth: 0,
    proUsers: 0,
    freeUsers: 0,
    blockedUsers: 0,
    totalDocuments: 0,
    readyDocuments: 0,
    processingDocuments: 0,
    failedDocuments: 0,
    totalPages: 0,
    totalChatSessions: 0,
    chatMessagesToday: 0,
    aiGenerationsToday: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    revenueToday: 0,
    freeToProConversionRate: 0,
    topUsedFeature: null,
    featureUsage: [],
    revenueSeries: [],
    heavyAiUsers: [],
    attentionDocuments: [],
    recentSubscriptions: [],
    alerts: [],
    activeUsers: 0,
    activeUsersList: [],
  };
}

function sendOverviewFallback(res, source = 'fallback') {
  res.set('X-Admin-Overview-Cache', source);
  return res.json(overviewCache || overviewFallback);
}

function isMongoUnavailableError(err) {
  return ['MongoNetworkTimeoutError', 'MongoNetworkError', 'MongoServerSelectionError'].includes(err?.name)
    || /timed out|ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(err?.message || '');
}

async function buildOverviewResponse(req, now, today) {
  // Get admin user IDs to exclude from counts
  const adminIds = await User.distinct('id', { role: 'ADMIN' });

  // 1. Real-time active users from WS connections (exclude admins)
  const onlineIds = getOnlineUserIds().filter((id) => !adminIds.includes(id));
  const activeUsers = onlineIds.length;
  const activeUsersList = await getActiveUsersList(8, adminIds);

  // 2. Compute or load cached heavy statistics
  let stats = overviewCache;
  if (!stats || (now.getTime() - overviewCacheTime > OVERVIEW_CACHE_TTL)) {
    const monthStart = startOfMonth();

    const [
      totalUsers,
      newUsersToday,
      newUsersThisMonth,
      blockedUsers,
      totalDocuments,
      readyDocuments,
      processingDocuments,
      failedDocuments,
      pageRows,
      totalChatSessions,
      chatMessagesToday,
      aiGenerationsToday,
      activeProCount,
      revenueTotals,
      featureUsage,
      heavyRows,
      attentionDocuments,
      recentSubscriptions,
      revenueSeries,
    ] = await Promise.all([
      User.countDocuments({ id: { $nin: adminIds }, status: { $ne: 'deleted' } }),
      User.countDocuments({ id: { $nin: adminIds }, created_at: { $gte: today }, status: { $ne: 'deleted' } }),
      User.countDocuments({ id: { $nin: adminIds }, created_at: { $gte: monthStart }, status: { $ne: 'deleted' } }),
      User.countDocuments({ status: 'blocked', role: { $ne: 'ADMIN' } }),
      Document.countDocuments({}),
      Document.countDocuments({ status: 'READY' }),
      Document.countDocuments({ status: { $in: ['PROCESSING', 'UPLOADING'] } }),
      Document.countDocuments({ status: 'FAILED' }),
      Document.aggregate([{ $group: { _id: null, total: { $sum: '$page_count' } } }]),
      ChatSession.countDocuments({}),
      countChatMessagesSince(today, 'user'),
      UsageLog.countDocuments({ feature: 'ai_features', date: todayUTC() }),
      countActiveProSubscriptions({ user_id: { $nin: adminIds } }),
      getRevenueTotals(),
      buildFeatureUsage(),
      chatMessagesByUserSince(today, 8),
      getAttentionDocuments(8),
      getRecentSubscriptions(8),
      buildOverviewRevenueSeries(),
    ]);

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

    stats = {
      totalUsers,
      newUsersToday,
      newUsersThisMonth,
      proUsers: activeProCount,
      freeUsers: Math.max(totalUsers - activeProCount, 0),
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
      freeToProConversionRate: totalUsers ? Math.round((activeProCount / totalUsers) * 1000) / 10 : 0,
      topUsedFeature,
      featureUsage,
      revenueSeries,
      heavyAiUsers: heavyRows.map((row) => ({
        user: serializeUser(heavyUserMap.get(row._id)),
        chat_messages: row.chat_messages,
      })),
      attentionDocuments,
      recentSubscriptions,
      alerts,
    };
  }

  return {
    ...stats,
    activeUsers,
    activeUsersList,
  };
}

// GET /api/v1/admin/overview
router.get('/overview', async (req, res) => {
  try {
    const now = new Date();
    if (overviewCache && (now.getTime() - overviewCacheTime <= OVERVIEW_CACHE_TTL)) {
      res.set('X-Admin-Overview-Cache', 'hit');
      return res.json(overviewCache);
    }
    if (!overviewCache && now.getTime() < overviewFailureUntil) {
      return sendOverviewFallback(res, 'cooldown');
    }

    const today = startOfToday();
    if (!overviewInFlight) {
      overviewInFlight = buildOverviewResponse(req, now, today).finally(() => {
        overviewInFlight = null;
      });
    }

    const responseData = await overviewInFlight;
    overviewCache = responseData;
    overviewCacheTime = now.getTime();
    res.json(responseData);
  } catch (err) {
    if (isMongoUnavailableError(err)) {
      console.warn('Admin overview MongoDB timeout, refreshing connections:', err.message);
      refreshConnections().catch(() => {});
      if (overviewCache) {
        res.set('X-Admin-Overview-Cache', 'stale');
        return res.json(overviewCache);
      }
      overviewFailureUntil = Date.now() + OVERVIEW_FAILURE_COOLDOWN;
      return sendOverviewFallback(res, 'fallback');
    }
    console.error('Admin overview error:', err);
    res.status(500).json({ detail: 'Lỗi tải tổng quan admin' });
  }
});

// GET /api/v1/admin/users
router.get('/users', async (req, res) => {
  try {
    const { page, limit, skip } = parsePageLimit(req.query);
    const sort = VALID_SORTS.has(req.query.sort) ? req.query.sort : 'created_desc';
    const requiresComputedSort = ['last_active_desc', 'documents_desc', 'ai_today_desc'].includes(sort);
    const { query } = await buildUserListQuery(req, { includeSearch: true });
    const sortSpec = sort === 'created_asc' ? { created_at: 1 } : { created_at: -1 };

    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query).select(USER_LIST_PROJECTION).sort(sortSpec).skip(skip).limit(limit).lean(),
    ]);
    let items = await enrichUsers(users);
    if (requiresComputedSort) items = sortUsers(items, sort);

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

    const [subscription, docs, sessions, chatCount, usageLogs, recentUsage, chatUsed, aiUsed, docCount, presenceByUser] = await Promise.all([
      UserSubscription.findOne({ user_id: user.id }).lean(),
      Document.find({ owner_id: user.id }).select(DOCUMENT_LIST_PROJECTION).sort({ uploaded_at: -1 }).limit(30).lean(),
      UserSession.find({ user_id: user.id }).sort({ last_active: -1 }).limit(20).lean(),
      ChatSession.countDocuments({ user_id: user.id }),
      UsageLog.find({ user_id: user.id }).sort({ created_at: -1 }).limit(40).lean(),
      UsageLog.find({ user_id: user.id }).sort({ created_at: -1 }).limit(10).lean(),
      usageToday(user.id, 'chat_messages'),
      usageToday(user.id, 'ai_features'),
      Document.countDocuments({ owner_id: user.id }),
      getPresenceByUser([user.id]),
    ]);

    const planMap = await getPlanMap();
    const plan = subscription ? planMap.get(subscription.plan_id) : planMap.get('free');
    const owner = serializeUser(user);
    const presence = presenceByUser.get(user.id) || {};

    res.json({
      user: serializeUser(user, {
        is_pro: Boolean(subscription && subscription.status === 'active' && subscription.plan_id !== 'free' && (!subscription.expires_at || new Date(subscription.expires_at) > new Date())),
        is_online: (user.status || 'active') === 'active' && (presence.online_sessions || 0) > 0,
        last_active: presence.last_active || null,
        online_until: presence.online_until || null,
      }),
      subscription: subscription ? serializeSubscription(subscription) : null,
      plan: plan ? serializePlan(plan) : null,
      quotaUsage: {
        documents: docCount,
        chat_messages: chatUsed,
        ai_generations: aiUsed,
        limits: plan?.quota || null,
      },
      documents: docs.map((doc) => serializeDocumentListItem(doc, owner)),
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
    clearOverviewCache();
    sendAdminRealtimeEvent('user_updated', { user_id: target.id, role: updates.role, status: updates.status }).catch(console.error);
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
    clearOverviewCache();
    sendAdminRealtimeEvent('subscription_updated', { user_id: user.id, plan_id: plan.id }).catch(console.error);

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

    const filter = {
      status: 'paid',
      paid_at: { $gte: from, $lte: to },
    };

    const planMap = await getPlanMap();
    const [transactionPreview, planRows] = await Promise.all([
      PaymentTransaction.find(filter).sort({ paid_at: -1 }).limit(50).lean(),
      PaymentTransaction.aggregate([
        { $match: filter },
        { $group: { _id: '$plan_id', revenue: { $sum: '$amount_vnd' }, count: { $sum: 1 } } },
      ]),
    ]);
    const users = await User.find({ id: { $in: transactionPreview.map((tx) => tx.user_id) } }).lean();
    const userMap = new Map(users.map((user) => [user.id, user]));

    const totalRevenue = planRows.reduce((sum, row) => sum + formatCurrencyAmount(row.revenue), 0);
    const monthlyPlanRevenue = planRows
      .filter((row) => planMap.get(row._id)?.billing_cycle === 'monthly')
      .reduce((sum, row) => sum + formatCurrencyAmount(row.revenue), 0);
    const annualPlanRevenue = planRows
      .filter((row) => planMap.get(row._id)?.billing_cycle === 'annual')
      .reduce((sum, row) => sum + formatCurrencyAmount(row.revenue), 0);

    const [totalUsers, activeProCount, upgradedThisMonth] = await Promise.all([
      User.countDocuments({ status: { $ne: 'deleted' } }),
      countActiveProSubscriptions(),
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
      transactions: transactionPreview.map((tx) => ({
        ...stripMongo(tx),
        user: serializeUser(userMap.get(tx.user_id)),
        plan: serializePlan(planMap.get(tx.plan_id)),
      })),
      planBreakdown: planRows.map((row) => ({
        plan_id: row._id,
        revenue: row.revenue,
        count: row.count,
        plan: serializePlan(planMap.get(row._id)),
      })),
      conversionStats: {
        totalUsers,
        proUsers: activeProCount,
        freeUsers: Math.max(totalUsers - activeProCount, 0),
        upgradedThisMonth,
        freeToProConversionRate: totalUsers ? Math.round((activeProCount / totalUsers) * 1000) / 10 : 0,
      },
    });
  } catch (err) {
    if (isMongoUnavailableError(err)) {
      console.warn('Admin revenue MongoDB timeout, refreshing connections:', err.message);
      refreshConnections().catch(() => {});
    } else {
      console.error('Admin revenue error:', err);
    }
    res.status(500).json({ detail: 'Lỗi tải doanh thu' });
  }
});

// GET /api/v1/admin/transactions
router.get('/transactions', async (req, res) => {
  try {
    const now = new Date();
    const from = parseDate(req.query.from, startOfYear(now));
    const to = parseDate(req.query.to, now);
    to.setHours(23, 59, 59, 999);
    const { page, limit, skip } = parsePageLimit(req.query);

    const filter = { status: 'paid', paid_at: { $gte: from, $lte: to } };
    const [total, transactions] = await Promise.all([
      PaymentTransaction.countDocuments(filter),
      PaymentTransaction.find(filter).sort({ paid_at: -1 }).skip(skip).limit(limit).lean(),
    ]);

    const planMap = await getPlanMap();
    const users = await User.find({ id: { $in: transactions.map((tx) => tx.user_id) } }).lean();
    const userMap = new Map(users.map((user) => [user.id, user]));

    res.json({
      items: transactions.map((tx) => ({
        ...stripMongo(tx),
        user: serializeUser(userMap.get(tx.user_id)),
        plan: serializePlan(planMap.get(tx.plan_id)),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Admin transactions error:', err);
    res.status(500).json({ detail: 'Lỗi tải giao dịch' });
  }
});

// GET /api/v1/admin/activity
router.get('/activity', async (req, res) => {
  try {
    const activeWithinMinutes = Math.max(1, Number.parseInt(req.query.activeWithinMinutes, 10) || DEFAULT_ACTIVITY_WINDOW_MINUTES);
    const { page, limit, skip } = parsePageLimit(req.query);
    const since = new Date(Date.now() - activeWithinMinutes * 60 * 1000);
    const match = { user_id: { $ne: req.userId }, last_active: { $gte: since } };

    const [total, sessions] = await Promise.all([
      UserSession.countDocuments(match),
      UserSession.find(match).sort({ last_active: -1 }).skip(skip).limit(limit).lean(),
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
    const { page, limit, skip } = parsePageLimit(req.query);
    const query = {};
    if (req.query.status) query.status = String(req.query.status).toUpperCase();
    if (req.query.owner) query.owner_id = String(req.query.owner);
    if (req.query.from || req.query.to) {
      query.uploaded_at = {};
      const from = parseDate(req.query.from, null);
      const to = parseDate(req.query.to, null);
      if (from) query.uploaded_at.$gte = from;
      if (to) query.uploaded_at.$lte = to;
      if (!Object.keys(query.uploaded_at).length) delete query.uploaded_at;
    }

    if (req.query.search) {
      const regex = buildVietnameseRegex(req.query.search);
      const owners = await User.find({
        $or: [{ email: regex }, { full_name: regex }, { student_id: regex }],
      }).select(USER_LIST_PROJECTION).lean();
      const ownerIds = owners.map((owner) => owner.id);
      query.$or = [{ file_name: regex }];
      if (ownerIds.length) query.$or.push({ owner_id: { $in: ownerIds } });
    }

    const [total, docs] = await Promise.all([
      Document.countDocuments(query),
      Document.find(query).select(DOCUMENT_LIST_PROJECTION).sort({ uploaded_at: -1 }).skip(skip).limit(limit).lean(),
    ]);
    const owners = await User.find({ id: { $in: docs.map((doc) => doc.owner_id) } }).select(USER_LIST_PROJECTION).lean();
    const ownerMap = new Map(owners.map((user) => [user.id, user]));
    const items = docs.map((doc) => serializeDocumentListItem(doc, ownerMap.get(doc.owner_id)));

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
    clearOverviewCache();
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
    clearOverviewCache();
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
    clearOverviewCache();
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
    if (req.query.admin_id) {
      const search = String(req.query.admin_id).trim();
      if (search) {
        const matchingAdmins = await User.find({
          role: 'ADMIN',
          $or: [
            { id: search },
            { full_name: new RegExp(search, 'i') },
            { email: new RegExp(search, 'i') },
          ]
        }).select('id').lean();
        query.admin_id = { $in: matchingAdmins.map((u) => u.id) };
      }
    }
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

// Run payment transactions backfill exactly once at boot in background
ensurePaymentTransactionsBackfilled().catch((err) => {
  console.error('Failed to backfill payment transactions at boot:', err);
});

module.exports = router;
module.exports.clearOverviewCache = clearOverviewCache;

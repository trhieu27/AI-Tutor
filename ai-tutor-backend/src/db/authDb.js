const mongoose = require('mongoose');
const config = require('../config');
const { presenceOnlineUntil } = require('../utils/presence');

let authConnectionPromise = null;
const USER_CACHE_TTL_MS = 60 * 60 * 1000;
const userCacheByEmail = new Map();
const userCacheById = new Map();
const AUTH_USER_PROJECTION = {
    _id: 0,
    id: 1,
    student_id: 1,
    full_name: 1,
    email: 1,
    role: 1,
    status: 1,
    hashed_password: 1,
    provider: 1,
    preferences: 1,
    created_at: 1,
    updated_at: 1,
};

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function isMongoUnavailableError(err) {
    return ['MongoNetworkTimeoutError', 'MongoNetworkError', 'MongoServerSelectionError'].includes(err?.name) ||
        /timed out|ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(err?.message || '');
}

function cacheUser(user) {
    if (!user) return user;
    const plainUser = typeof user.toObject === 'function'
        ? user.toObject({ versionKey: false })
        : user;
    const entry = { user: plainUser, cachedAt: Date.now() };
    const emailKey = normalizeEmail(plainUser.email);
    if (emailKey) userCacheByEmail.set(emailKey, entry);
    if (plainUser.id) userCacheById.set(String(plainUser.id), entry);
    return plainUser;
}

function readCache(cache, key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > USER_CACHE_TTL_MS) {
        cache.delete(key);
        return null;
    }
    return entry.user;
}

function getCachedAuthUserByEmail(email) {
    if (!email) return null;
    return readCache(userCacheByEmail, normalizeEmail(email));
}

function getCachedAuthUserById(id) {
    if (!id) return null;
    return readCache(userCacheById, String(id));
}

function createAuthConnection() {
    return mongoose.createConnection(config.mongoUrl, {
        dbName: config.databaseName,
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        waitQueueTimeoutMS: 2000,
        maxPoolSize: 2,
        minPoolSize: 0,
        maxConnecting: 1,
        maxIdleTimeMS: 30000,
        heartbeatFrequencyMS: 10000,
        retryReads: false,
        retryWrites: false,
    }).asPromise();
}

async function getAuthConnection() {
    if (!authConnectionPromise) {
        authConnectionPromise = createAuthConnection().catch((err) => {
            authConnectionPromise = null;
            throw err;
        });
    }
    return authConnectionPromise;
}

async function withAuthDb(operation, options = {}) {
    const retries = options.retries ?? 2;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        let conn = null;
        try {
            conn = await getAuthConnection();
            return await operation(conn.db);
        } catch (err) {
            if (!isMongoUnavailableError(err) || attempt >= retries) {
                throw err;
            }
            authConnectionPromise = null;
            if (conn) conn.close().catch(() => {});
            await delay(250 * (attempt + 1));
        }
    }
    throw new Error('MongoDB auth operation failed');
}

function studentUserQuery(email) {
    return {
        email,
        $or: [{ role: { $ne: 'ADMIN' } }, { role: { $exists: false } }],
    };
}

async function findStudentAuthUser(email, options = {}) {
    const normalizedEmail = normalizeEmail(email);
    if (options.preferCache) {
        const cached = getCachedAuthUserByEmail(normalizedEmail);
        if (cached && cached.role !== 'ADMIN') return cached;
    }

    try {
        return cacheUser(await withAuthDb((db) => db.collection('users').findOne(
            studentUserQuery(normalizedEmail), { collation: { locale: 'en', strength: 2 } }
        ), options));
    } catch (err) {
        if (options.fallbackToCache && isMongoUnavailableError(err)) {
            const cached = getCachedAuthUserByEmail(normalizedEmail);
            if (cached && cached.role !== 'ADMIN') return cached;
        }
        throw err;
    }
}

async function findAdminAuthUser(email, options = {}) {
    const normalizedEmail = normalizeEmail(email);
    if (options.preferCache) {
        const cached = getCachedAuthUserByEmail(normalizedEmail);
        if (cached?.role === 'ADMIN') return cached;
    }

    try {
        return cacheUser(await withAuthDb((db) => db.collection('users').findOne(
            { email: normalizedEmail, role: 'ADMIN' },
            { collation: { locale: 'en', strength: 2 } }
        ), options));
    } catch (err) {
        if (options.fallbackToCache && isMongoUnavailableError(err)) {
            const cached = getCachedAuthUserByEmail(normalizedEmail);
            if (cached?.role === 'ADMIN') return cached;
        }
        throw err;
    }
}

async function findAuthUserById(id, options = {}) {
  if (options.preferCache) {
    const cached = getCachedAuthUserById(id);
    if (cached) return cached;
  }

  try {
    return cacheUser(await withAuthDb((db) => db.collection('users').findOne({ id }), options));
  } catch (err) {
    if (options.fallbackToCache && isMongoUnavailableError(err)) {
      const cached = getCachedAuthUserById(id);
      if (cached) return cached;
    }
    throw err;
  }
}

async function findAuthUserByEmail(email, options = {}) {
    const normalizedEmail = normalizeEmail(email);
    if (options.preferCache) {
        const cached = getCachedAuthUserByEmail(normalizedEmail);
        if (cached) return cached;
    }

    try {
        return cacheUser(await withAuthDb((db) => db.collection('users').findOne({ email: normalizedEmail }, { collation: { locale: 'en', strength: 2 } }), options));
    } catch (err) {
        if (options.fallbackToCache && isMongoUnavailableError(err)) {
            const cached = getCachedAuthUserByEmail(normalizedEmail);
            if (cached) return cached;
        }
        throw err;
    }
}

async function createGoogleAuthUser({ id, studentId, fullName, email }) {
    const now = new Date();
    const user = {
        id,
        student_id: studentId,
        full_name: fullName,
        email,
        role: 'STUDENT',
        status: 'active',
        hashed_password: '',
        provider: 'google',
        preferences: {
            email_notifications: true,
            ai_response_detail: 'balanced',
        },
        created_at: now,
        updated_at: now,
    };
    await withAuthDb((db) => db.collection('users').insertOne(user));
    return cacheUser(user);
}

async function warmAuthCache() {
    const users = await withAuthDb((db) => db.collection('users')
        .find({ status: { $ne: 'deleted' } })
        .project(AUTH_USER_PROJECTION)
        .limit(1000)
        .toArray(), { retries: 1 });

    users.forEach(cacheUser);
    const adminCount = users.filter((user) => user.role === 'ADMIN').length;
    console.log(`✅ Auth cache warmed: ${users.length} account(s), ${adminCount} admin account(s)`);
}

async function createAuthSession({ id, userId, userAgent, ipAddress }) {
    const now = new Date();
    await withAuthDb((db) => db.collection('user_sessions').insertOne({
        id,
        user_id: userId,
        user_agent: userAgent,
        ip_address: ipAddress,
        created_at: now,
        last_active: now,
        is_online: true,
        online_until: presenceOnlineUntil(now),
    }));
}

async function isAuthUserPro(userId) {
    const sub = await withAuthDb((db) => db.collection('user_subscriptions').findOne({
        user_id: userId,
        status: 'active',
    }));
    if (!sub || sub.plan_id === 'free') return false;
    if (sub.expires_at && new Date(sub.expires_at) < new Date()) return false;
    return true;
}

module.exports = {
    cacheAuthUser: cacheUser,
    createAuthSession,
    createGoogleAuthUser,
    findAdminAuthUser,
    findAuthUserByEmail,
    findAuthUserById,
    findStudentAuthUser,
    getCachedAuthUserByEmail,
    getCachedAuthUserById,
    isAuthUserPro,
    isMongoUnavailableError,
    normalizeEmail,
    studentUserQuery,
    warmAuthCache,
};

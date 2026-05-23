const mongoose = require('mongoose');
const config = require('../config');

let db = null;
let reconnecting = false;

// ── Production-grade MongoDB options ──────────────────────────────────────────
// Reference: MongoDB Node.js Driver best practices
// https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/
const MONGO_OPTIONS = {
  dbName: config.databaseName,

  // ── Server Selection ──
  // Thời gian tối đa để driver chọn server phù hợp.
  // Default MongoDB: 30s. Vercel/Heroku: 15-30s.
  serverSelectionTimeoutMS: 30000,

  // ── Connection ──
  // Timeout TCP handshake. Không liên quan tới query.
  // Default MongoDB: 30s.
  connectTimeoutMS: 30000,

  // ── Socket ──
  // Thời gian chờ phản hồi từ server SAU KHI đã gửi query.
  // ĐÂY LÀ NGUYÊN NHÂN CHÍNH gây drop connection trên Atlas M0.
  // Default MongoDB: 0 (no timeout). Production: 45-120s.
  // Atlas M0 aggregate chậm → cần >= 45s.
  socketTimeoutMS: 45000,

  // ── Connection Pool ──
  // maxPoolSize: số connection tối đa trong pool.
  // Production (small app): 10-50. Large app: 50-100.
  maxPoolSize: 20,
  // minPoolSize: giữ sẵn connection để tránh cold start.
  // Atlas M0: nên giữ thấp (1-2) để không chiếm hết connection limit (500).
  minPoolSize: 2,

  // ── Idle & Keep-Alive ──
  // Thời gian connection idle trước khi bị đóng.
  // Atlas M0 đóng idle connection sau ~60s → set >= 60s.
  maxIdleTimeMS: 60000,

  // ── Monitoring ──
  // Tần suất heartbeat check server health.
  // Default MongoDB: 10s. Production: 10s (không nên đổi).
  heartbeatFrequencyMS: 10000,

  // ── Retry ──
  // Auto-retry khi gặp transient network error.
  retryReads: true,
  retryWrites: true,

  // ── Read Preference ──
  // 'nearest': đọc từ replica gần nhất (latency thấp).
  // Phù hợp Atlas vì data đã được replicate.
  readPreference: 'nearest',
};

async function connectDB() {
  try {
    const conn = await mongoose.connect(config.mongoUrl, MONGO_OPTIONS);
    db = conn.connection;

    // Monitor connection health
    db.on('error', (err) => {
      console.error('⚠️ MongoDB connection error:', err.message);
    });

    db.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected, driver will auto-reconnect');
    });

    db.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    console.log(`✅ MongoDB connected: ${config.databaseName}`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  }
}

/**
 * Force refresh all connections in the pool.
 * Call this when repeated timeouts are detected.
 */
async function refreshConnections() {
  if (reconnecting) return;
  reconnecting = true;
  try {
    console.log('🔄 Refreshing MongoDB connections...');
    const client = mongoose.connection.getClient();
    await client.close(true);
    await mongoose.connect(config.mongoUrl, MONGO_OPTIONS);
    console.log('✅ MongoDB connections refreshed');
  } catch (err) {
    console.error('❌ MongoDB refresh failed:', err.message);
  } finally {
    reconnecting = false;
  }
}

function getDB() {
  return mongoose.connection;
}

async function closeDB() {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
}

module.exports = { connectDB, getDB, closeDB, refreshConnections };

const mongoose = require('mongoose');
const config = require('../config');

let db = null;
let reconnecting = false;

async function connectDB() {
  try {
    const conn = await mongoose.connect(config.mongoUrl, {
      dbName: config.databaseName,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 8000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 15000,
      heartbeatFrequencyMS: 8000,
      retryReads: true,
      retryWrites: true,
      readPreference: 'nearest',
    });
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
    // Close all existing connections in the pool
    await client.close(true);
    // Reconnect
    await mongoose.connect(config.mongoUrl, {
      dbName: config.databaseName,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 8000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 15000,
      heartbeatFrequencyMS: 8000,
      retryReads: true,
      retryWrites: true,
      readPreference: 'nearest',
    });
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

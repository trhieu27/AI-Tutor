const mongoose = require('mongoose');
const config = require('../config');

let db = null;

async function connectDB() {
  try {
    const conn = await mongoose.connect(config.mongoUrl, {
      dbName: config.databaseName,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    db = conn.connection;
    console.log(`✅ MongoDB connected: ${config.databaseName}`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  }
}

function getDB() {
  return mongoose.connection;
}

async function closeDB() {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
}

module.exports = { connectDB, getDB, closeDB };

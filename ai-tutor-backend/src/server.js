require('dotenv').config();

// ── Global crash prevention ───────────────────────────────────────────────────
// Gemini SDK throws inside ReadableStream controllers (outside route try-catch).
// These handlers prevent the process from crashing on transient API errors.
process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection] Caught (server kept alive):', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('[UncaughtException] Caught (server kept alive):', err.message);
});

const http = require('http');
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const { connectDB } = require('./db/mongoose');
const { notificationManager } = require('./utils/notifications');

// Routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const documentsRoutes = require('./routes/documents');
const chatRoutes = require('./routes/chat');
const quotaRoutes = require('./routes/quota');
const notificationsRoutes = require('./routes/notifications');
const plansRoutes = require('./routes/plans');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);

// ── CORS ────────────────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: (origin, callback) => {
    // Dev: allow all origins (phone, tablet, any device on any IP)
    if (isDev) return callback(null, true);
    // Production: strict whitelist only
    if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
}));

// ── Body parser ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request logger ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} ${res.statusCode}`);
  });
  next();
});

// ── Storage dir ──────────────────────────────────────────────────────────────
fs.mkdirSync(config.uploadDir, { recursive: true });

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/v1', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/documents', documentsRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/quota', quotaRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/plans', plansRoutes);
app.use('/api/v1/admin', adminRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'healthy' }));

app.get('/', (req, res) => res.json({
  status: 'ok',
  app: 'AI Tutor Backend (Node.js)',
  version: '1.0.0',
  updated_at: new Date().toISOString(),
}));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('CRITICAL ERROR:', err.message);
  res.status(err.status || 500).json({ detail: err.message || 'Backend Error' });
});

// ── WebSocket: /api/v1/ws/notifications ──────────────────────────────────────
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws, userId) => {
  notificationManager.connect(userId, ws);

  ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));

  ws.on('message', (data) => {
    const msg = data.toString();
    if (msg === 'ping') ws.send('pong');
  });

  ws.on('close', () => {
    notificationManager.disconnect(userId, ws);
  });

  ws.on('error', (err) => {
    console.error(`[WS] Error for ${userId}:`, err.message);
    notificationManager.disconnect(userId, ws);
  });
});

server.on('upgrade', (request, socket, head) => {
  const base = `http://${request.headers.host || 'localhost'}`;
  const parsed = new URL(request.url, base);
  const pathname = parsed.pathname;
  const token = parsed.searchParams.get('token');

  if (pathname === '/api/v1/ws/notifications') {
    try {
      const payload = jwt.verify(token, config.jwtSecret, { algorithms: [config.jwtAlgorithm] });
      const userId = payload.sub;
      if (!userId) {
        socket.destroy();
        return;
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, userId);
      });
    } catch {
      socket.destroy();
    }
  } else {
    socket.destroy();
  }
});

// ── Start ────────────────────────────────────────────────────────────────────
async function start() {
  await connectDB();
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`🚀 AI Tutor Backend (Node.js) running on http://0.0.0.0:${config.port}`);
    console.log(`📡 WebSocket available at ws://0.0.0.0:${config.port}/api/v1/ws/notifications`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

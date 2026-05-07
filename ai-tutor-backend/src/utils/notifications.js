/**
 * WebSocket Notification Manager — multi-tab support per user.
 * Converts Python's NotificationManager class to JS.
 */
const { Notification } = require('../db/models');
const { v4: uuidv4 } = require('uuid');

class NotificationManager {
  constructor() {
    // { userId: Set<WebSocket> }
    this._connections = new Map();
  }

  connect(userId, ws) {
    if (!this._connections.has(userId)) {
      this._connections.set(userId, new Set());
    }
    this._connections.get(userId).add(ws);
    console.log(`[WS] ${userId} connected (tabs: ${this._connections.get(userId).size})`);
  }

  disconnect(userId, ws) {
    const sockets = this._connections.get(userId);
    if (!sockets) return;
    sockets.delete(ws);
    if (sockets.size === 0) this._connections.delete(userId);
  }

  async push(userId, payload) {
    const sockets = this._connections.get(userId);
    if (!sockets || sockets.size === 0) return;
    const dead = [];
    for (const ws of sockets) {
      try {
        if (ws.readyState === 1) { // OPEN
          ws.send(JSON.stringify(payload));
        } else {
          dead.push(ws);
        }
      } catch {
        dead.push(ws);
      }
    }
    dead.forEach(ws => sockets.delete(ws));
  }
}

const notificationManager = new NotificationManager();

async function sendNotification(userId, notifType, title, message, metadata = {}) {
  const doc = {
    id: uuidv4(),
    user_id: userId,
    type: notifType,
    title,
    message,
    is_read: false,
    metadata,
    created_at: new Date().toISOString(),
  };
  await Notification.create(doc);

  await notificationManager.push(userId, {
    type: notifType,
    title,
    message,
    metadata,
    created_at: doc.created_at,
    id: doc.id,
  });

  console.log(`[Notif] ${notifType} → ${userId}`);
}

module.exports = { notificationManager, sendNotification };

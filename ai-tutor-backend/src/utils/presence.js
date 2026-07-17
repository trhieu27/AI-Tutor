const PRESENCE_HEARTBEAT_MS = 30 * 1000;
const PRESENCE_GRACE_MS = 75 * 1000;

function presenceOnlineUntil(now = new Date()) {
  return new Date(now.getTime() + PRESENCE_GRACE_MS);
}

function presenceOnlineUpdate(now = new Date()) {
  return {
    last_active: now,
    is_online: true,
    online_until: presenceOnlineUntil(now),
  };
}

function presenceOfflineUpdate(now = new Date()) {
  return {
    last_active: now,
    is_online: false,
    online_until: now,
  };
}

module.exports = {
  PRESENCE_GRACE_MS,
  PRESENCE_HEARTBEAT_MS,
  presenceOnlineUntil,
  presenceOnlineUpdate,
  presenceOfflineUpdate,
};

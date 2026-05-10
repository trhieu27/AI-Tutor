/**
 * In-memory rate limiter — no DB queries, O(1) lookup.
 * Resets on server restart (acceptable for dev; use Redis for production).
 */
const store = new Map(); // key → { attempts, lockedUntil }

class RateLimiter {
  async checkLimit(key, maxAttempts = 5, lockMinutes = 1) {
    const now = Date.now();
    const record = store.get(key);
    if (!record) return true;

    if (record.lockedUntil && now < record.lockedUntil) {
      const secondsLeft = Math.ceil((record.lockedUntil - now) / 1000);
      const err = new Error(`Thử quá nhiều lần. Vui lòng thử lại sau ${secondsLeft} giây.`);
      err.statusCode = 429;
      throw err;
    }

    // Lock expired — clean up
    if (record.lockedUntil && now >= record.lockedUntil) {
      store.delete(key);
    }
    return true;
  }

  async addAttempt(key, maxAttempts = 5, lockMinutes = 1) {
    const now = Date.now();
    const record = store.get(key) || { attempts: 0, lockedUntil: null };
    const newAttempts = record.attempts + 1;

    if (newAttempts >= maxAttempts) {
      const lockedUntil = now + lockMinutes * 60 * 1000;
      store.set(key, { attempts: newAttempts, lockedUntil });
      const err = new Error(`Bạn đã nhập sai ${maxAttempts} lần. Tài khoản bị tạm khóa trong ${lockMinutes} phút.`);
      err.statusCode = 429;
      throw err;
    } else {
      store.set(key, { attempts: newAttempts, lockedUntil: null });
    }
  }

  async reset(key) {
    store.delete(key);
  }
}

module.exports = { RateLimiter };

const { RateLimit } = require('../db/models');

class RateLimiter {
  async checkLimit(key, maxAttempts = 5, lockMinutes = 1) {
    const now = new Date();
    const record = await RateLimit.findOne({ key });

    if (record) {
      if (record.locked_until && now < record.locked_until) {
        const secondsLeft = Math.ceil((record.locked_until - now) / 1000);
        const err = new Error(`Thử quá nhiều lần. Vui lòng thử lại sau ${secondsLeft} giây.`);
        err.statusCode = 429;
        throw err;
      }
      if (record.locked_until && now >= record.locked_until) {
        await RateLimit.updateOne({ key }, { $set: { attempts: 0, locked_until: null } });
      }
    }
    return true;
  }

  async addAttempt(key, maxAttempts = 5, lockMinutes = 1) {
    const now = new Date();
    const record = await RateLimit.findOne({ key });

    if (!record) {
      await RateLimit.create({ key, attempts: 1, last_attempt: now, locked_until: null });
      return;
    }

    const newAttempts = record.attempts + 1;
    if (newAttempts >= maxAttempts) {
      const lockedUntil = new Date(now.getTime() + lockMinutes * 60 * 1000);
      await RateLimit.updateOne({ key }, { $set: { attempts: newAttempts, locked_until: lockedUntil, last_attempt: now } });
      const err = new Error(`Bạn đã nhập sai ${maxAttempts} lần. Tài khoản bị tạm khóa trong ${lockMinutes} phút.`);
      err.statusCode = 429;
      throw err;
    } else {
      await RateLimit.updateOne({ key }, { $set: { attempts: newAttempts, last_attempt: now } });
    }
  }

  async reset(key) {
    await RateLimit.deleteOne({ key });
  }
}

module.exports = { RateLimiter };

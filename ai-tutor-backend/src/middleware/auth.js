const jwt = require('jsonwebtoken');
const config = require('../config');
const { UserSession } = require('../db/models');
const { cacheAuthUser, findAuthUserById, isMongoUnavailableError } = require('../db/authDb');
const { presenceOnlineUpdate } = require('../utils/presence');

/**
 * Middleware to verify JWT access token and attach user_id to req.userId
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Token không hợp lệ' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: [config.jwtAlgorithm] });
    if (payload.type && payload.type !== 'access') {
      return res.status(401).json({ detail: 'Invalid token type' });
    }
    const user = await findAuthUserById(payload.sub, { fallbackToCache: true, preferCache: true });
    if (!user) return res.status(401).json({ detail: 'Người dùng không tồn tại' });
    if (user.status && user.status !== 'active') {
      return res.status(403).json({ detail: 'Tài khoản đã bị khóa hoặc không còn hoạt động' });
    }

    req.userId = payload.sub;
    req.userEmail = payload.email;
    req.user = user;
    req.sessionId = payload.sid || null;
    cacheAuthUser(user);

    if (payload.sid) {
      const activeSession = await UserSession.findOne({ id: payload.sid, user_id: payload.sub }).lean();
      if (!activeSession) {
        return res.status(401).json({ detail: 'Phiên đăng nhập đã hết hạn hoặc bị thu hồi' });
      }

      const now = new Date();
      UserSession.updateOne(
        { id: payload.sid, user_id: payload.sub },
        { $set: presenceOnlineUpdate(now) }
      ).catch(() => {});
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ detail: 'Token đã hết hạn' });
    }
    if (isMongoUnavailableError(err)) {
      return res.status(503).json({ detail: 'Cơ sở dữ liệu đang phản hồi chậm. Vui lòng thử lại sau vài giây.' });
    }
    return res.status(401).json({ detail: 'Không thể xác thực danh tính' });
  }
}

module.exports = { authMiddleware };

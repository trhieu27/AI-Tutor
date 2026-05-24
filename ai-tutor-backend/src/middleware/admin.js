const jwt = require('jsonwebtoken');
const config = require('../config');
const { UserSession } = require('../db/models');
const { cacheAuthUser, findAuthUserById, isMongoUnavailableError } = require('../db/authDb');
const { presenceOnlineUpdate } = require('../utils/presence');

async function adminMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Token không hợp lệ' });
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: [config.jwtAlgorithm] });
    if (payload.type && payload.type !== 'access') {
      return res.status(401).json({ detail: 'Invalid token type' });
    }

    const user = await findAuthUserById(payload.sub);
    if (!user) return res.status(401).json({ detail: 'Người dùng không tồn tại' });
    if ((user.status || 'active') !== 'active') {
      return res.status(403).json({ detail: 'Tài khoản admin không còn hoạt động' });
    }
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ detail: 'Bạn không có quyền truy cập khu vực admin' });
    }

    req.userId = user.id;
    req.userEmail = user.email;
    req.user = user;
    req.sessionId = payload.sid || null;
    cacheAuthUser(user);

    if (payload.sid) {
      const now = new Date();
      UserSession.updateOne(
        { id: payload.sid, user_id: user.id },
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
    return res.status(401).json({ detail: 'Không thể xác thực quyền admin' });
  }
}

module.exports = { adminMiddleware };

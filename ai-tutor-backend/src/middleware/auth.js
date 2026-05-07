const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware to verify JWT access token and attach user_id to req.userId
 */
function authMiddleware(req, res, next) {
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
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ detail: 'Token đã hết hạn' });
    }
    return res.status(401).json({ detail: 'Không thể xác thực danh tính' });
  }
}

module.exports = { authMiddleware };

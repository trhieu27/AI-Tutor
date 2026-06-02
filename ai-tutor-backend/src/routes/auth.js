const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { User, OTP } = require('../db/models');
const {
  cacheAuthUser,
  createAuthSession,
  createGoogleAuthUser,
  findAdminAuthUser,
  findAuthUserByEmail,
  findAuthUserById,
  findStudentAuthUser,
  isAuthUserPro,
  isMongoUnavailableError,
  normalizeEmail,
  studentUserQuery,
} = require('../db/authDb');
const { RateLimiter } = require('../utils/rateLimiter');
const { sendOtpEmail } = require('../utils/email');
const config = require('../config');
const { authMiddleware } = require('../middleware/auth');
const { sendAdminRealtimeEvent } = require('../utils/notifications');
const { clearAdminOverviewCache } = require('../utils/cacheInvalidation');

function createAccessToken(data) {
  return jwt.sign(
    { ...data, type: 'access' },
    config.jwtSecret,
    { algorithm: config.jwtAlgorithm, expiresIn: `${config.accessTokenExpireMinutes}m` }
  );
}

function createRefreshToken(data) {
  return jwt.sign(
    { ...data, type: 'refresh' },
    config.jwtSecret,
    { algorithm: config.jwtAlgorithm, expiresIn: `${config.refreshTokenExpireDays}d` }
  );
}

function generateOtp(length = 6) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
}

async function serializeAuthUser(user) {
  let isPro = false;
  try {
    isPro = await isAuthUserPro(user.id);
  } catch (err) {
    console.warn(`Could not resolve Pro status for user ${user.id}:`, err.message);
  }

  return {
    id: user.id,
    student_id: user.student_id || '',
    full_name: user.full_name || '',
    email: user.email || '',
    role: user.role || 'STUDENT',
    status: user.status || 'active',
    is_pro: isPro,
  };
}

async function createSession(req, userId) {
  const sessionId = uuidv4();
  const ua = (req.headers['user-agent'] || '').slice(0, 300);
  const ip = req.ip || req.connection?.remoteAddress || '';
  try {
    await createAuthSession({ id: sessionId, userId, userAgent: ua, ipAddress: ip });
  } catch (err) {
    console.warn(`Could not persist login session for user ${userId}:`, err.message);
    return null;
  }
  return sessionId;
}

async function issueTokensForUser(req, user) {
  const sessionId = await createSession(req, user.id);
  const tokenData = { sub: user.id, email: user.email };
  if (sessionId) tokenData.sid = sessionId;
  return {
    access_token: createAccessToken(tokenData),
    refresh_token: createRefreshToken(tokenData),
  };
}

function sendDatabaseUnavailable(res) {
  return res.status(503).json({
    detail: 'Cơ sở dữ liệu đang phản hồi chậm. Vui lòng thử đăng nhập lại sau vài giây.',
  });
}

// POST /api/v1/register
router.post('/register', async (req, res) => {
  try {
    const { student_id, full_name, email, password } = req.body;
    if (!student_id || !full_name || !email || !password) {
      return res.status(400).json({ detail: 'Thiếu thông tin đăng ký' });
    }
    const normalizedEmail = normalizeEmail(email);

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(400).json({ detail: 'Email đã được đăng ký' });

    const hashed_password = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const user = await User.create({
      id: userId, student_id, full_name, email: normalizedEmail, hashed_password,
    });
    cacheAuthUser(user);
    clearAdminOverviewCache();
    sendAdminRealtimeEvent('user_updated', { user_id: userId, status: 'registered' }).catch(console.error);

    const { access_token, refresh_token } = await issueTokensForUser(req, user);

    return res.status(201).json({
      access_token, refresh_token, token_type: 'bearer',
      user: await serializeAuthUser(user),
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// POST /api/v1/login
router.post('/login', async (req, res) => {
  const limiter = new RateLimiter();
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ detail: 'Thiếu email hoặc mật khẩu' });
    const normalizedEmail = normalizeEmail(email);

    await limiter.checkLimit(normalizedEmail);

    const user = await findStudentAuthUser(normalizedEmail, { fallbackToCache: true, preferCache: true });
    const passwordOk = user && user.hashed_password
      ? await bcrypt.compare(password, user.hashed_password)
      : false;

    if (!user || !passwordOk) {
      await limiter.addAttempt(normalizedEmail);
      return res.status(401).json({ detail: 'Email hoặc mật khẩu không chính xác' });
    }
    if (user.status && user.status !== 'active') {
      return res.status(403).json({ detail: 'Tài khoản đã bị khóa hoặc không còn hoạt động' });
    }
    await limiter.reset(normalizedEmail);

    const { access_token, refresh_token } = await issueTokensForUser(req, user);

    return res.json({
      access_token, refresh_token, token_type: 'bearer',
      user: await serializeAuthUser(user),
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ detail: err.message });
    if (isMongoUnavailableError(err)) return sendDatabaseUnavailable(res);
    console.error('Login error:', err);
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// POST /api/v1/admin-login
router.post('/admin-login', async (req, res) => {
  const limiter = new RateLimiter();
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ detail: 'Thiếu email hoặc mật khẩu admin' });
    const normalizedEmail = normalizeEmail(email);

    await limiter.checkLimit(`admin_${normalizedEmail}`);

    const user = await findAdminAuthUser(normalizedEmail);
    const passwordOk = user && user.hashed_password
      ? await bcrypt.compare(password, user.hashed_password)
      : false;

    if (!user || !passwordOk) {
      await limiter.addAttempt(`admin_${normalizedEmail}`);
      return res.status(401).json({ detail: 'Email hoặc mật khẩu admin không chính xác' });
    }
    if (user.status && user.status !== 'active') {
      return res.status(403).json({ detail: 'Tài khoản admin đã bị khóa hoặc không còn hoạt động' });
    }
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ detail: 'Tài khoản này không có quyền quản trị' });
    }

    await limiter.reset(`admin_${normalizedEmail}`);
    const { access_token, refresh_token } = await issueTokensForUser(req, user);

    return res.json({
      access_token, refresh_token, token_type: 'bearer',
      user: await serializeAuthUser(user),
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ detail: err.message });
    if (isMongoUnavailableError(err)) return sendDatabaseUnavailable(res);
    console.error('Admin login error:', err);
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// POST /api/v1/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne(studentUserQuery(normalizedEmail));
    if (!user) return res.status(404).json({ detail: 'Email không tồn tại trong hệ thống' });

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await OTP.findOneAndUpdate(
      { email: normalizedEmail },
      { otp, created_at: new Date(), expires_at: expiresAt },
      { upsert: true }
    );

    sendOtpEmail(normalizedEmail, otp);
    res.json({ message: 'Mã xác thực đã được gửi tới email của bạn' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// POST /api/v1/verify-otp
router.post('/verify-otp', async (req, res) => {
  const limiter = new RateLimiter();
  try {
    const { email, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);
    await limiter.checkLimit(`otp_${normalizedEmail}`, 3);

    const record = await OTP.findOne({ email: normalizedEmail, otp });
    if (!record) {
      await limiter.addAttempt(`otp_${normalizedEmail}`, 3);
      return res.status(400).json({ detail: 'Mã OTP không chính xác' });
    }
    if (new Date() > record.expires_at) {
      return res.status(400).json({ detail: 'Mã OTP đã hết hạn' });
    }

    await limiter.reset(`otp_${normalizedEmail}`);
    res.json({ message: 'Xác thực mã OTP thành công' });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ detail: err.message });
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// POST /api/v1/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const record = await OTP.findOne({ email: normalizedEmail, otp });
    if (!record || new Date() > record.expires_at) {
      return res.status(400).json({ detail: 'Xác thực không hợp lệ hoặc đã hết hạn' });
    }

    const hashed_password = await bcrypt.hash(new_password, 12);
    const result = await User.updateOne(studentUserQuery(normalizedEmail), { $set: { hashed_password } });
    if (result.modifiedCount === 0) {
      return res.status(500).json({ detail: 'Không thể cập nhật mật khẩu' });
    }
    const updatedUser = await User.findOne(studentUserQuery(normalizedEmail));
    if (updatedUser) cacheAuthUser(updatedUser);

    await OTP.deleteOne({ email: normalizedEmail });
    res.json({ message: 'Mật khẩu đã được đặt lại thành công' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// POST /api/v1/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ detail: 'Thiếu refresh token' });

    const payload = jwt.verify(refresh_token, config.jwtSecret, { algorithms: [config.jwtAlgorithm] });
    if (payload.type !== 'refresh') {
      return res.status(401).json({ detail: 'Invalid token type' });
    }

    const user = await findAuthUserById(payload.sub, { fallbackToCache: true, preferCache: true });
    if (!user) return res.status(401).json({ detail: 'Người dùng không tồn tại' });
    if (user.status && user.status !== 'active') {
      return res.status(403).json({ detail: 'Tài khoản đã bị khóa hoặc không còn hoạt động' });
    }

    const newAccessToken = createAccessToken({ sub: payload.sub, email: user.email, sid: payload.sid });
    res.json({ access_token: newAccessToken, token_type: 'bearer' });
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ detail: 'Refresh token has expired' });
    if (isMongoUnavailableError(err)) return sendDatabaseUnavailable(res);
    res.status(401).json({ detail: 'Could not validate refresh token' });
  }
});

// POST /api/v1/google-login
router.post('/google-login', async (req, res) => {
  try {
    const { token } = req.body;
    const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const googleData = response.data;
    const email = normalizeEmail(googleData.email);
    const full_name = googleData.name || 'Người dùng Google';

    if (!email) return res.status(400).json({ detail: 'Không lấy được email từ Google' });
    if (googleData.email_verified === false) {
      return res.status(400).json({ detail: 'Email Google chưa được xác minh' });
    }

    let user = await findAuthUserByEmail(email, { fallbackToCache: true, preferCache: true });
    if (!user) {
      const student_id = 'STU_GG_' + email.split('@')[0];
      user = await createGoogleAuthUser({
        id: uuidv4(),
        studentId: student_id,
        fullName: full_name,
        email,
      });
      clearAdminOverviewCache();
      sendAdminRealtimeEvent('user_updated', { user_id: user.id, status: 'registered' }).catch(console.error);
    }

    if (user.status && user.status !== 'active') {
      return res.status(403).json({ detail: 'Tài khoản đã bị khóa hoặc không còn hoạt động' });
    }
    const { access_token, refresh_token } = await issueTokensForUser(req, user);

    res.json({
      access_token, refresh_token, token_type: 'bearer',
      user: await serializeAuthUser(user),
    });
  } catch (err) {
    if (isMongoUnavailableError(err)) return sendDatabaseUnavailable(res);
    console.error('Google login error:', err.message);
    res.status(400).json({ detail: err.message || 'Xác thực Google thất bại' });
  }
});

module.exports = router;

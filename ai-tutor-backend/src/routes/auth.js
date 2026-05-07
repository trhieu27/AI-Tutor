const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { User, UserSession, OTP } = require('../db/models');
const { RateLimiter } = require('../utils/rateLimiter');
const { sendOtpEmail } = require('../utils/email');
const config = require('../config');
const { authMiddleware } = require('../middleware/auth');

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

// POST /api/v1/register
router.post('/register', async (req, res) => {
  try {
    const { student_id, full_name, email, password } = req.body;
    if (!student_id || !full_name || !email || !password) {
      return res.status(400).json({ detail: 'Thiếu thông tin đăng ký' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ detail: 'Email đã được đăng ký' });

    const hashed_password = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const user = await User.create({
      id: userId, student_id, full_name, email, hashed_password,
    });

    const tokenData = { sub: user.id, email: user.email };
    const access_token = createAccessToken(tokenData);
    const refresh_token = createRefreshToken(tokenData);

    return res.status(201).json({
      access_token, refresh_token, token_type: 'bearer',
      user: { id: user.id, full_name: user.full_name, email: user.email, student_id: user.student_id },
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

    await limiter.checkLimit(email);

    const user = await User.findOne({ email });
    const passwordOk = user && user.hashed_password
      ? await bcrypt.compare(password, user.hashed_password)
      : false;

    if (!user || !passwordOk) {
      await limiter.addAttempt(email);
      return res.status(401).json({ detail: 'Email hoặc mật khẩu không chính xác' });
    }

    await limiter.reset(email);

    // Record session
    const sessionId = uuidv4();
    const ua = (req.headers['user-agent'] || '').slice(0, 300);
    const ip = req.ip || req.connection?.remoteAddress || '';
    await UserSession.create({ id: sessionId, user_id: user.id, user_agent: ua, ip_address: ip });

    const tokenData = { sub: user.id, email: user.email, sid: sessionId };
    const access_token = createAccessToken(tokenData);
    const refresh_token = createRefreshToken(tokenData);

    return res.json({
      access_token, refresh_token, token_type: 'bearer',
      user: { id: user.id, full_name: user.full_name, email: user.email, student_id: user.student_id, is_pro: user.is_pro || false },
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ detail: err.message });
    console.error('Login error:', err);
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// POST /api/v1/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ detail: 'Email không tồn tại trong hệ thống' });

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await OTP.findOneAndUpdate(
      { email },
      { otp, created_at: new Date(), expires_at: expiresAt },
      { upsert: true }
    );

    sendOtpEmail(email, otp);
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
    await limiter.checkLimit(`otp_${email}`, 3);

    const record = await OTP.findOne({ email, otp });
    if (!record) {
      await limiter.addAttempt(`otp_${email}`, 3);
      return res.status(400).json({ detail: 'Mã OTP không chính xác' });
    }
    if (new Date() > record.expires_at) {
      return res.status(400).json({ detail: 'Mã OTP đã hết hạn' });
    }

    await limiter.reset(`otp_${email}`);
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
    const record = await OTP.findOne({ email, otp });
    if (!record || new Date() > record.expires_at) {
      return res.status(400).json({ detail: 'Xác thực không hợp lệ hoặc đã hết hạn' });
    }

    const hashed_password = await bcrypt.hash(new_password, 12);
    const result = await User.updateOne({ email }, { $set: { hashed_password } });
    if (result.modifiedCount === 0) {
      return res.status(500).json({ detail: 'Không thể cập nhật mật khẩu' });
    }

    await OTP.deleteOne({ email });
    res.json({ message: 'Mật khẩu đã được đặt lại thành công' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// POST /api/v1/refresh
router.post('/refresh', (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ detail: 'Thiếu refresh token' });

    const payload = jwt.verify(refresh_token, config.jwtSecret, { algorithms: [config.jwtAlgorithm] });
    if (payload.type !== 'refresh') {
      return res.status(401).json({ detail: 'Invalid token type' });
    }

    const newAccessToken = createAccessToken({ sub: payload.sub, email: payload.email });
    res.json({ access_token: newAccessToken, token_type: 'bearer' });
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ detail: 'Refresh token has expired' });
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
    const email = googleData.email;
    const full_name = googleData.name || 'Người dùng Google';

    if (!email) return res.status(400).json({ detail: 'Không lấy được email từ Google' });

    let user = await User.findOne({ email });
    if (!user) {
      const student_id = 'STU_GG_' + email.split('@')[0];
      user = await User.create({
        id: String(Date.now()),
        student_id, full_name, email,
        hashed_password: '',
        provider: 'google',
      });
    }

    const tokenData = { sub: user.id, email: user.email };
    const access_token = createAccessToken(tokenData);
    const refresh_token = createRefreshToken(tokenData);

    res.json({
      access_token, refresh_token, token_type: 'bearer',
      user: { id: user.id, full_name: user.full_name, email: user.email, student_id: user.student_id },
    });
  } catch (err) {
    console.error('Google login error:', err.message);
    res.status(400).json({ detail: err.message || 'Xác thực Google thất bại' });
  }
});

module.exports = router;

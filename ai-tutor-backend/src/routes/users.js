const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User, UserSession } = require('../db/models');
const { authMiddleware } = require('../middleware/auth');
const { sendSupportEmail } = require('../utils/email');
const { isUserPro } = require('../utils/quota');

async function serializeUser(user) {
  return {
    id: user.id,
    student_id: user.student_id || '',
    full_name: user.full_name || '',
    email: user.email || '',
    bio: user.bio || null,
    is_pro: await isUserPro(user.id),
    preferences: user.preferences || { email_notifications: true, ai_response_detail: 'balanced' },
    created_at: user.created_at ? String(user.created_at) : '',
  };
}

// GET /api/v1/users/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.userId });
    if (!user) return res.status(404).json({ detail: 'Người dùng không tồn tại' });
    res.json(await serializeUser(user));
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// PUT /api/v1/users/profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { full_name, bio } = req.body;
    const updates = { updated_at: new Date() };
    if (full_name !== undefined) {
      if (!full_name.trim()) return res.status(400).json({ detail: 'Tên không được để trống' });
      updates.full_name = full_name.trim();
    }
    if (bio !== undefined) updates.bio = bio.trim().slice(0, 300);

    await User.updateOne({ id: req.userId }, { $set: updates });
    const user = await User.findOne({ id: req.userId });
    res.json(await serializeUser(user));
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// PUT /api/v1/users/password
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;
    const user = await User.findOne({ id: req.userId });
    if (!user) return res.status(404).json({ detail: 'Người dùng không tồn tại' });

    const ok = await bcrypt.compare(current_password, user.hashed_password);
    if (!ok) return res.status(400).json({ detail: 'Mật khẩu hiện tại không đúng' });
    if (new_password !== confirm_password) return res.status(400).json({ detail: 'Mật khẩu mới không khớp' });
    if (new_password.length < 8) return res.status(400).json({ detail: 'Mật khẩu mới phải có ít nhất 8 ký tự' });

    const hashed = await bcrypt.hash(new_password, 12);
    await User.updateOne({ id: req.userId }, { $set: { hashed_password: hashed, updated_at: new Date() } });
    res.json({ message: 'Mật khẩu đã được cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// (upgrade-pro endpoint removed — Pro status is determined by subscription)

// PUT /api/v1/users/preferences
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const { email_notifications, ai_response_detail } = req.body;
    const updates = {};
    if (email_notifications !== undefined) updates['preferences.email_notifications'] = email_notifications;
    if (ai_response_detail !== undefined) {
      const valid = ['concise', 'balanced', 'detailed'];
      if (!valid.includes(ai_response_detail)) return res.status(400).json({ detail: 'Giá trị không hợp lệ' });
      updates['preferences.ai_response_detail'] = ai_response_detail;
    }
    if (Object.keys(updates).length) {
      updates.updated_at = new Date();
      await User.updateOne({ id: req.userId }, { $set: updates });
    }
    const user = await User.findOne({ id: req.userId });
    res.json(await serializeUser(user));
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// GET /api/v1/users/sessions
router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const sessions = await UserSession.find({ user_id: req.userId }).sort({ last_active: -1 }).limit(20).lean();
    sessions.forEach(s => { delete s._id; });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// DELETE /api/v1/users/sessions/:sessionId
router.delete('/sessions/:sessionId', authMiddleware, async (req, res) => {
  try {
    const result = await UserSession.deleteOne({ id: req.params.sessionId, user_id: req.userId });
    if (result.deletedCount === 0) return res.status(404).json({ detail: 'Không tìm thấy phiên đăng nhập' });
    res.json({ message: 'Đã thu hồi phiên đăng nhập' });
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// DELETE /api/v1/users/sessions
router.delete('/sessions', authMiddleware, async (req, res) => {
  try {
    await UserSession.deleteMany({ user_id: req.userId });
    res.json({ message: 'Đã đăng xuất khỏi tất cả thiết bị' });
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

// POST /api/v1/users/support
router.post('/support', authMiddleware, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject?.trim()) return res.status(400).json({ detail: 'Chủ đề không được để trống' });
    if (!message?.trim() || message.trim().length < 20) return res.status(400).json({ detail: 'Nội dung phải có ít nhất 20 ký tự' });

    const user = await User.findOne({ id: req.userId });
    if (!user) return res.status(404).json({ detail: 'Người dùng không tồn tại' });

    const ok = await sendSupportEmail(user.full_name, user.email, subject.trim(), message.trim());
    if (!ok) console.warn(`Support email not sent (SMTP not configured) from ${user.email}`);

    res.json({ message: 'Yêu cầu hỗ trợ đã được gửi thành công' });
  } catch (err) {
    res.status(500).json({ detail: 'Lỗi server' });
  }
});

module.exports = router;

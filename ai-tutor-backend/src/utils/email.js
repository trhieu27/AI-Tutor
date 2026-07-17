const nodemailer = require('nodemailer');
const config = require('../config');

function createTransport() {
  if (!config.smtp.user || !config.smtp.password) return null;
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: false,
    auth: { user: config.smtp.user, pass: config.smtp.password },
    tls: { rejectUnauthorized: false },
  });
}

async function sendOtpEmail(emailTo, otpCode) {
  if (!config.smtp.user || !config.smtp.password) {
    console.log('\n' + '!'.repeat(50));
    console.log('WARNING: Email SMTP is not configured. OTP will be printed to terminal only.');
    console.log(`EMAIL TO: ${emailTo}`);
    console.log(`OTP CODE: ${otpCode}`);
    console.log('!'.repeat(50) + '\n');
    return false;
  }

  try {
    const transporter = createTransport();
    const html = `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f6fa; padding: 20px;">
        <div style="max-width: 500px; background: white; padding: 30px; border-radius: 15px; margin: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <h2 style="color: #4f46e5; text-align: center;">Xác thực tài khoản AI Tutor</h2>
          <p style="color: #4b5563; line-height: 1.6;">Chào bạn, chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã OTP dưới đây:</p>
          <div style="background: #f3f4f6; padding: 15px; text-align: center; border-radius: 10px; margin: 25px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${otpCode}</span>
          </div>
          <p style="color: #9ca3af; font-size: 13px; text-align: center;">Mã này sẽ hết hạn sau 5 phút. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
        </div>
      </body>
    </html>`;

    await transporter.sendMail({
      from: `"${config.smtp.fromName}" <${config.smtp.user}>`,
      to: emailTo,
      subject: `Mã xác thực AI Tutor: ${otpCode}`,
      html,
    });
    console.log(`SUCCESS: OTP email sent to ${emailTo}`);
    return true;
  } catch (err) {
    console.error(`ERROR: Failed to send OTP email to ${emailTo}:`, err.message);
    return false;
  }
}

async function sendSupportEmail(senderName, senderEmail, subject, message) {
  if (!config.smtp.user || !config.smtp.password) {
    console.warn(`[SUPPORT] SMTP not configured. From: ${senderEmail} | Subject: ${subject}\n${message}`);
    return false;
  }

  try {
    const transporter = createTransport();
    const html = `
    <html>
      <body style="font-family:Arial,sans-serif;background:#f4f6fa;padding:20px;">
        <div style="max-width:560px;background:#fff;padding:32px;border-radius:16px;margin:auto;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
          <h2 style="color:#4f46e5;margin-top:0;">Yêu cầu hỗ trợ mới</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:100px;">Người gửi</td><td style="padding:8px 0;font-size:13px;font-weight:600;color:#111827;">${senderName}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Email</td><td style="padding:8px 0;font-size:13px;color:#4f46e5;">${senderEmail}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Chủ đề</td><td style="padding:8px 0;font-size:13px;font-weight:600;color:#111827;">${subject}</td></tr>
          </table>
          <div style="background:#f9fafb;border-left:3px solid #4f46e5;padding:16px 20px;border-radius:8px;">
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.8;white-space:pre-wrap;">${message}</p>
          </div>
        </div>
      </body>
    </html>`;

    await transporter.sendMail({
      from: `"${config.smtp.fromName}" <${config.smtp.user}>`,
      to: config.smtp.user,
      replyTo: `"${senderName}" <${senderEmail}>`,
      subject: `[Hỗ trợ AI Tutor] ${subject}`,
      html,
    });
    return true;
  } catch (err) {
    console.error('ERROR: send_support_email failed:', err.message);
    return false;
  }
}

module.exports = { sendOtpEmail, sendSupportEmail };

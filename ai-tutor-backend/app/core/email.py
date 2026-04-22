import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)


def _cfg():
    """Luôn lấy settings mới nhất (tránh lru_cache stale khi import sớm)."""
    from app.core.config import get_settings
    return get_settings()


def send_otp_email(email_to: str, otp_code: str):
    """
    Gửi mã OTP về email người dùng
    """
    settings = _cfg()
    logger.info(f"[SMTP] send_otp_email → SMTP_USER={settings.SMTP_USER!r}")

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("\n" + "!"*50)
        print("WARNING: Email SMTP is not configured. OTP will be printed to terminal only.")
        print(f"EMAIL TO: {email_to}")
        print(f"OTP CODE: {otp_code}")
        print("!"*50 + "\n")
        return False

    try:
        message = MIMEMultipart()
        message["From"]    = f"{settings.EMAILS_FROM_NAME} <{settings.SMTP_USER}>"
        message["To"]      = email_to
        message["Subject"] = f"Mã xác thực AI Tutor: {otp_code}"

        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #f4f6fa; padding: 20px;">
                <div style="max-width: 500px; background: white; padding: 30px; border-radius: 15px; margin: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <h2 style="color: #4f46e5; text-align: center;">Xác thực tài khoản AI Tutor</h2>
                    <p style="color: #4b5563; line-height: 1.6;">Chào bạn, chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã OTP dưới đây để hoàn tất quy trình:</p>
                    <div style="background: #f3f4f6; padding: 15px; text-align: center; border-radius: 10px; margin: 25px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">{otp_code}</span>
                    </div>
                    <p style="color: #9ca3af; font-size: 13px; text-align: center;">Mã này sẽ hết hạn sau 5 phút. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
                </div>
            </body>
        </html>
        """
        message.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(message)

        logger.info(f"SUCCESS: OTP email sent to {email_to}")
        return True

    except Exception as e:
        logger.error(f"ERROR: Failed to send OTP email to {email_to}: {e}")
        return False


def send_support_email(sender_name: str, sender_email: str, subject: str, message: str) -> bool:
    """
    Chuyển tiếp yêu cầu hỗ trợ từ người dùng đến hộp thư SMTP_USER.
    """
    settings = _cfg()
    logger.info(f"[SMTP] send_support_email | SMTP_USER={settings.SMTP_USER!r} | from={sender_email}")

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"[SUPPORT] SMTP not configured. From: {sender_email} | Subject: {subject}\n{message}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["From"]     = f"{settings.EMAILS_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"]       = settings.SMTP_USER
        msg["Reply-To"] = f"{sender_name} <{sender_email}>"
        msg["Subject"]  = f"[Hỗ trợ AI Tutor] {subject}"

        html = f"""
        <html>
          <body style="font-family:Arial,sans-serif;background:#f4f6fa;padding:20px;">
            <div style="max-width:560px;background:#fff;padding:32px;border-radius:16px;margin:auto;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
              <h2 style="color:#4f46e5;margin-top:0;">Yêu cầu hỗ trợ mới</h2>
              <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;width:100px;">Người gửi</td>
                  <td style="padding:8px 0;font-size:13px;font-weight:600;color:#111827;">{sender_name}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;">Email</td>
                  <td style="padding:8px 0;font-size:13px;color:#4f46e5;">{sender_email}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;">Chủ đề</td>
                  <td style="padding:8px 0;font-size:13px;font-weight:600;color:#111827;">{subject}</td>
                </tr>
              </table>
              <div style="background:#f9fafb;border-left:3px solid #4f46e5;padding:16px 20px;border-radius:8px;">
                <p style="margin:0;font-size:14px;color:#374151;line-height:1.8;white-space:pre-wrap;">{message}</p>
              </div>
              <p style="margin-top:24px;font-size:11px;color:#9ca3af;text-align:center;">
                Reply trực tiếp email này để phản hồi về {sender_email}
              </p>
            </div>
          </body>
        </html>
        """
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"SUCCESS: Support email from {sender_email} sent to {settings.SMTP_USER}")
        return True

    except Exception as e:
        logger.error(f"ERROR: send_support_email failed: {e}")
        return False

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import get_settings

settings = get_settings()

def send_otp_email(email_to: str, otp_code: str):
    """
    Gửi mã OTP về email người dùng
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("\n" + "!"*50)
        print("WARNING: Email SMTP is not configured. OTP will be printed to terminal only.")
        print(f"EMAIL TO: {email_to}")
        print(f"OTP CODE: {otp_code}")
        print("!"*50 + "\n")
        return False

    try:
        # 1. Tạo bản tin Email
        message = MIMEMultipart()
        message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.SMTP_USER}>"
        message["To"] = email_to
        message["Subject"] = f"Mã xác thực AI Tutor: {otp_code}"

        # 2. Nội dung HTML (Đẹp hơn so với text thuần)
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

        # 3. Kết nối SMTP và gửi
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls() # Bảo mật kết nối
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(message)
        
        print(f"SUCCESS: OTP email sent to {email_to}")
        return True

    except Exception as e:
        print(f"ERROR: Failed to send email to {email_to}: {str(e)}")
        return False

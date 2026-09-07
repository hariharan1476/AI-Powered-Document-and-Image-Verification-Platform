"""
SMTP Email Service
Sends OTP verification and password reset emails using Gmail SMTP.
"""
import os
import smtplib
import random
import string
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timedelta


SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
APP_NAME = os.getenv("APP_NAME", "AI Document Verification Platform")

OTP_EXPIRE_MINUTES = 10
RESET_TOKEN_EXPIRE_MINUTES = 30


def generate_otp() -> str:
    """Generate a cryptographically secure 6-digit OTP."""
    return ''.join(random.choices(string.digits, k=6))


def otp_expiry() -> datetime:
    return datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)


def reset_token_expiry() -> datetime:
    return datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)


def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an HTML email via SMTP. Returns True on success."""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print(f"[EMAIL] SMTP not configured — skipping send to {to_email}")
        print(f"[EMAIL] Subject: {subject}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{APP_NAME} <{SMTP_EMAIL}>"
        msg["To"] = to_email

        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())

        print(f"[EMAIL] Sent '{subject}' to {to_email}")
        return True

    except Exception as e:
        print(f"[EMAIL] Failed to send to {to_email}: {e}")
        return False


def send_otp_email(to_email: str, name: str, otp: str) -> bool:
    """Send the email verification OTP."""
    subject = f"Verify your email — {APP_NAME}"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:40px;text-align:center;">
                  <div style="width:64px;height:64px;background:rgba(255,255,255,0.2);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                    <span style="font-size:32px;">🔐</span>
                  </div>
                  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Verify Your Email</h1>
                  <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:15px;">{APP_NAME}</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <p style="margin:0 0 20px;color:#475569;font-size:16px;line-height:1.6;">Hi <strong style="color:#1e293b;">{name}</strong>,</p>
                  <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.6;">
                    Thanks for signing up! Use the verification code below to confirm your email address.
                    This code expires in <strong>{OTP_EXPIRE_MINUTES} minutes</strong>.
                  </p>
                  <!-- OTP Box -->
                  <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:16px;padding:32px;text-align:center;margin-bottom:28px;">
                    <div style="font-size:14px;font-weight:600;color:#94a3b8;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;">Verification Code</div>
                    <div style="font-size:48px;font-weight:800;letter-spacing:12px;color:#4f46e5;font-family:'Courier New',monospace;">{otp}</div>
                  </div>
                  <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;text-align:center;">
                    ⚠️ Never share this code with anyone. Our team will never ask for it.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                  <p style="margin:0;color:#94a3b8;font-size:13px;">
                    If you didn't create an account, you can safely ignore this email.
                  </p>
                  <p style="margin:8px 0 0;color:#cbd5e1;font-size:12px;">&copy; 2024 {APP_NAME}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """
    return _send_email(to_email, subject, html)


def send_password_reset_email(to_email: str, name: str, reset_token: str) -> bool:
    """Send password reset email with a secure link."""
    reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    subject = f"Reset your password — {APP_NAME}"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#dc2626,#ef4444);padding:40px;text-align:center;">
                  <div style="width:64px;height:64px;background:rgba(255,255,255,0.2);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                    <span style="font-size:32px;">🔑</span>
                  </div>
                  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Reset Your Password</h1>
                  <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:15px;">{APP_NAME}</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <p style="margin:0 0 20px;color:#475569;font-size:16px;line-height:1.6;">Hi <strong style="color:#1e293b;">{name}</strong>,</p>
                  <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.6;">
                    We received a request to reset your password. Click the button below to choose a new password.
                    This link expires in <strong>{RESET_TOKEN_EXPIRE_MINUTES} minutes</strong>.
                  </p>
                  <!-- CTA Button -->
                  <div style="text-align:center;margin-bottom:28px;">
                    <a href="{reset_url}"
                       style="display:inline-block;background:linear-gradient(135deg,#dc2626,#ef4444);color:#ffffff;font-size:16px;font-weight:700;padding:16px 40px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(220,38,38,0.3);">
                      Reset Password →
                    </a>
                  </div>
                  <p style="margin:0;color:#94a3b8;font-size:13px;text-align:center;">
                    Or copy this link into your browser:<br>
                    <span style="color:#4f46e5;font-size:12px;word-break:break-all;">{reset_url}</span>
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                  <p style="margin:0;color:#94a3b8;font-size:13px;">
                    If you didn't request a password reset, you can safely ignore this email. Your password will not change.
                  </p>
                  <p style="margin:8px 0 0;color:#cbd5e1;font-size:12px;">&copy; 2024 {APP_NAME}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """
    return _send_email(to_email, subject, html)

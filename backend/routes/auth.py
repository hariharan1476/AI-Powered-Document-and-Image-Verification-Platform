"""
Complete SaaS-Grade Authentication Routes
Supports:
- Email/Password Signup & Login
- Dual Verification: 6-Digit OTP or Single-Use Magic Verification Link
- Token-Based Password Reset
- Argon2id Password Hashing
- Dual JWT Access & Refresh Tokens (with Token Rotation)
- Multi-Device Session Management (List sessions, Revoke, Logout All)
- Google OAuth 2.0 / OpenID Connect Integration
- Password Change & Security Notifications
"""
import secrets
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel, EmailStr

from backend.database.db import get_db
from backend.models.user import User, AccountStatus
from backend.models.oauth_account import OAuthAccount
from backend.models.verification_token import TokenType
from backend.services.auth_service import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)
from backend.services.email_service import (
    generate_otp,
    otp_expiry,
    send_otp_email,
    send_password_reset_email,
    _send_email,
    APP_NAME,
    FRONTEND_URL,
)
from backend.services.token_service import (
    create_verification_token,
    validate_verification_token,
)
from backend.services.session_service import (
    create_session,
    validate_and_rotate_session,
    revoke_session,
    revoke_all_sessions,
    list_active_sessions,
)
from backend.services.google_service import (
    get_google_auth_url,
    get_google_tokens_and_user_info,
)

router = APIRouter(
    prefix="/api/auth",
    tags=["Auth"]
)


# ─── Schemas ────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: str
    device_name: Optional[str] = "Web Browser"


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    is_admin: bool = False
    is_email_verified: bool = False
    status: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class SessionResponse(BaseModel):
    id: int
    device_name: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    last_used_at: datetime

    class Config:
        from_attributes = True


# ─── Helpers ────────────────────────────────────────────────────────────────

def _get_user_by_email(email: str, db: DBSession) -> Optional[User]:
    return db.query(User).filter(User.email == email.lower().strip()).first()


def _send_link_and_otp_email(user: User, db: DBSession):
    """Generate both 6-digit OTP and single-use link token, send unified email."""
    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires_at = otp_expiry()
    db.commit()

    raw_link_token = create_verification_token(
        db=db,
        user_id=user.id,
        token_type=TokenType.EMAIL_VERIFY,
        expires_minutes=60
    )

    verify_link = f"{FRONTEND_URL}/verify-email?token={raw_link_token}"
    subject = f"Verify your email — {APP_NAME}"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="540" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:24px;border:1px solid #334155;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
              <tr>
                <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px;text-align:center;">
                  <div style="font-size:40px;margin-bottom:12px;">🛡️</div>
                  <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Verify Your Email</h1>
                  <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">{APP_NAME}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <p style="margin:0 0 16px;color:#cbd5e1;font-size:16px;">Hi <strong style="color:#ffffff;">{user.name}</strong>,</p>
                  <p style="margin:0 0 28px;color:#94a3b8;font-size:15px;line-height:1.6;">
                    Thank you for signing up! Enter the code below on the registration screen, or click the verification button to automatically verify your account.
                  </p>
                  
                  <!-- OTP BOX -->
                  <div style="background:#0f172a;border:2px dashed #6366f1;border-radius:16px;padding:24px;text-align:center;margin-bottom:28px;">
                    <div style="font-size:13px;font-weight:700;color:#818cf8;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">6-Digit OTP Code</div>
                    <div style="font-size:42px;font-weight:800;letter-spacing:10px;color:#6366f1;font-family:monospace;">{otp}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:8px;">Expires in 10 minutes</div>
                  </div>

                  <!-- VERIFY BUTTON -->
                  <div style="text-align:center;margin-bottom:28px;">
                    <a href="{verify_link}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-size:16px;font-weight:700;padding:16px 36px;border-radius:14px;text-decoration:none;box-shadow:0 8px 20px rgba(99,102,241,0.35);">
                      Verify Email Address →
                    </a>
                  </div>

                  <p style="margin:0;color:#64748b;font-size:12px;text-align:center;word-break:break-all;">
                    Or paste this URL in your browser: <br>
                    <span style="color:#818cf8;">{verify_link}</span>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background:#0f172a;padding:20px 40px;border-top:1px solid #334155;text-align:center;color:#64748b;font-size:12px;">
                  If you did not request this, please ignore this email.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """
    _send_email(user.email, subject, html)


# ─── Routes ─────────────────────────────────────────────────────────────────

@router.post("/signup", status_code=201)
@router.post("/register", status_code=201)
def signup(req: SignupRequest, db: DBSession = Depends(get_db)):
    """Register a new user account and send OTP + verification link."""
    existing = _get_user_by_email(req.email, db)

    if existing:
        if existing.is_email_verified:
            raise HTTPException(
                status_code=400,
                detail="An account with this email address already exists. Please log in."
            )
        # Resend verification for unverified account
        _send_link_and_otp_email(existing, db)
        return {
            "message": "Verification code & link resent to your email address.",
            "email": existing.email
        }

    user = User(
        name=req.name.strip(),
        email=req.email.lower().strip(),
        hashed_password=get_password_hash(req.password),
        is_email_verified=False,
        status=AccountStatus.PENDING_VERIFICATION.value
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    _send_link_and_otp_email(user, db)

    return {
        "message": "Registration successful! A verification code and link have been sent to your email.",
        "email": user.email
    }


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(
    req: OTPVerifyRequest,
    request: Request,
    db: DBSession = Depends(get_db)
):
    """Verify email via 6-digit OTP code."""
    user = _get_user_by_email(req.email, db)
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    if user.is_email_verified:
        raise HTTPException(status_code=400, detail="Account is already verified. Please log in.")

    if not user.otp_code or not user.otp_expires_at:
        raise HTTPException(status_code=400, detail="No active OTP found. Please request a new code.")

    if datetime.utcnow() > user.otp_expires_at:
        raise HTTPException(status_code=400, detail="OTP code has expired. Please request a new one.")

    if user.otp_code.strip() != req.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP code. Please check your email and try again.")

    # Mark user verified
    user.is_email_verified = True
    user.status = AccountStatus.ACTIVE.value
    user.otp_code = None
    user.otp_expires_at = None
    user.last_login_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    # Generate tokens & session
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    create_session(
        db=db,
        user_id=user.id,
        refresh_token=refresh_token,
        device_name="Web Browser",
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/verify-email")
def verify_email_link(token: str, db: DBSession = Depends(get_db)):
    """Verify email via token link clicked from inbox."""
    vt = validate_verification_token(db, token, TokenType.EMAIL_VERIFY)
    if not vt:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link.")

    user = db.query(User).filter(User.id == vt.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.is_email_verified = True
    user.status = AccountStatus.ACTIVE.value
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()

    return {"message": "Email address verified successfully! You can now log in."}


@router.post("/resend-verification")
@router.post("/resend-otp")
def resend_verification(req: ResendVerificationRequest, db: DBSession = Depends(get_db)):
    """Resend verification OTP and single-use email link."""
    user = _get_user_by_email(req.email, db)
    if not user:
        raise HTTPException(status_code=404, detail="Account not found.")

    if user.is_email_verified:
        raise HTTPException(status_code=400, detail="Email is already verified.")

    _send_link_and_otp_email(user, db)
    return {"message": "A fresh verification code and link have been sent to your email address."}


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    db: DBSession = Depends(get_db)
):
    """
    Login with Email and Password. Accepts both JSON body and Form Data cleanly.
    Requires email verification. Returns access token, refresh token, and creates a session.
    """
    content_type = request.headers.get("content-type", "")
    email = None
    password = None
    device_name = "Web Browser"

    if "application/json" in content_type:
        try:
            body = await request.json()
            email = body.get("email") or body.get("username")
            password = body.get("password")
            device_name = body.get("device_name", "Web Browser")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON payload.")
    else:
        try:
            form = await request.form()
            email = form.get("username") or form.get("email")
            password = form.get("password")
            device_name = form.get("device_name", "Web Browser")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid form data.")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    user = _get_user_by_email(email, db)
    if not user or not user.hashed_password or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if user.status == AccountStatus.SUSPENDED.value or user.status == AccountStatus.DISABLED.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended or disabled. Please contact support."
        )

    if not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your email is not verified. Please check your inbox for the verification code/link."
        )

    # Update last login timestamp
    user.last_login_at = datetime.utcnow()
    db.commit()

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    create_session(
        db=db,
        user_id=user.id,
        refresh_token=refresh_token,
        device_name=device_name,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    req: RefreshTokenRequest,
    request: Request,
    db: DBSession = Depends(get_db)
):
    """Rotate refresh token and issue a fresh access token."""
    payload = decode_token(req.refresh_token, is_refresh=True)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token.")

    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_email_verified:
        raise HTTPException(status_code=401, detail="User account inactive or unverified.")

    new_access_token = create_access_token(data={"sub": str(user.id)})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})

    session = validate_and_rotate_session(
        db=db,
        refresh_token=req.refresh_token,
        new_refresh_token=new_refresh_token,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None
    )

    if not session:
        raise HTTPException(status_code=401, detail="Session revoked or invalid.")

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/logout")
def logout(
    req: RefreshTokenRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """Log out from current device by revoking session."""
    payload = decode_token(req.refresh_token, is_refresh=True)
    if payload:
        # Revoke active session matching refresh token
        from backend.services.auth_service import hash_token
        token_hash = hash_token(req.refresh_token)
        from backend.models.session import Session
        session = db.query(Session).filter(Session.refresh_token_hash == token_hash).first()
        if session:
            revoke_session(db, session.id, current_user.id)

    return {"message": "Successfully logged out."}


@router.post("/logout-all")
def logout_all_devices(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """Revoke all sessions across all devices for the current user."""
    count = revoke_all_sessions(db, current_user.id)
    return {"message": f"Successfully logged out from {count} device(s)."}


@router.get("/google")
def google_auth_login():
    """Get Google OAuth Authorization URL."""
    state = secrets.token_urlsafe(16)
    auth_url = get_google_auth_url(state)
    return {"url": auth_url, "state": state}


@router.get("/google/callback")
async def google_auth_callback(
    request: Request,
    code: Optional[str] = None,
    error: Optional[str] = None,
    db: DBSession = Depends(get_db)
):
    """Handle Google OAuth callback, authenticate or auto-register user cleanly."""
    from fastapi.responses import RedirectResponse

    if error or not code:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=google_denied")

    try:
        user_info = await get_google_tokens_and_user_info(code)
        if not user_info or not user_info.get("email"):
            return RedirectResponse(url=f"{FRONTEND_URL}/login?error=google_auth_failed")

        email = user_info["email"].lower().strip()
        google_sub = user_info["sub"]
        name = user_info.get("name") or email.split("@")[0]
        picture = user_info.get("picture")

        # Check if OAuth account exists
        oauth = db.query(OAuthAccount).filter(
            OAuthAccount.provider == "google",
            OAuthAccount.provider_account_id == google_sub
        ).first()

        if oauth:
            user = oauth.user
        else:
            user = _get_user_by_email(email, db)
            if not user:
                # Create user from Google profile (auto-verified!)
                user = User(
                    name=name,
                    email=email,
                    is_email_verified=True,
                    status=AccountStatus.ACTIVE.value,
                    avatar_url=picture
                )
                db.add(user)
                db.commit()
                db.refresh(user)

            # Link OAuth Account if not already linked
            existing_link = db.query(OAuthAccount).filter(
                OAuthAccount.user_id == user.id,
                OAuthAccount.provider == "google"
            ).first()

            if not existing_link:
                new_oauth = OAuthAccount(
                    user_id=user.id,
                    provider="google",
                    provider_account_id=google_sub
                )
                db.add(new_oauth)
                db.commit()

        # Ensure user is active & verified
        if not user.is_email_verified:
            user.is_email_verified = True
            user.status = AccountStatus.ACTIVE.value
        if picture and not user.avatar_url:
            user.avatar_url = picture
        user.last_login_at = datetime.utcnow()
        db.commit()

        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})

        create_session(
            db=db,
            user_id=user.id,
            refresh_token=refresh_token,
            device_name="Google OAuth Sign-In",
            user_agent=request.headers.get("user-agent"),
            ip_address=request.client.host if request.client else None
        )

        redirect_target = f"{FRONTEND_URL}/auth/callback?access_token={access_token}&refresh_token={refresh_token}"
        return RedirectResponse(url=redirect_target)

    except Exception as e:
        import urllib.parse
        err_msg = urllib.parse.quote(str(e))
        print(f"[GOOGLE OAUTH CALLBACK ERROR] {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error={err_msg}")


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: DBSession = Depends(get_db)):
    """Send password reset link to user's email."""
    user = _get_user_by_email(req.email, db)
    if user and user.is_email_verified:
        raw_reset_token = create_verification_token(
            db=db,
            user_id=user.id,
            token_type=TokenType.PASSWORD_RESET,
            expires_minutes=30
        )
        send_password_reset_email(user.email, user.name, raw_reset_token)

    # Always return standard response to prevent email enumeration
    return {
        "message": "If an account exists for that email, a password reset link has been sent."
    }


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: DBSession = Depends(get_db)):
    """Reset password using single-use hashed token from email link."""
    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")

    vt = validate_verification_token(db, req.token, TokenType.PASSWORD_RESET)
    if not vt:
        raise HTTPException(status_code=400, detail="Invalid or expired password reset link.")

    user = db.query(User).filter(User.id == vt.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.hashed_password = get_password_hash(req.new_password)
    db.commit()

    # Revoke all existing user sessions on password change for security
    revoke_all_sessions(db, user.id)

    return {"message": "Password reset successfully. You can now log in with your new password."}


@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """Authenticated user password change."""
    if not current_user.hashed_password or not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long.")

    current_user.hashed_password = get_password_hash(req.new_password)
    db.commit()

    return {"message": "Password updated successfully."}


@router.get("/sessions", response_model=List[SessionResponse])
def get_user_sessions(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """List all active sessions for the current user."""
    return list_active_sessions(db, current_user.id)


@router.delete("/sessions/{session_id}")
def revoke_user_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """Revoke a specific session."""
    success = revoke_session(db, session_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found or already revoked.")
    return {"message": "Session revoked."}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return profile of authenticated user."""
    return current_user

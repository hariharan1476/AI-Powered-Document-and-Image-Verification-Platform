"""
Auth Service — Argon2id password hashing, SHA-256 token hashing, JWT access/refresh tokens.
"""
import os
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.hash import argon2
from sqlalchemy.orm import Session as DBSession

from backend.database.db import get_db
from backend.models.user import User, AccountStatus

# ── Secrets ──────────────────────────────────────────────────────────────────
JWT_ACCESS_SECRET = os.getenv("JWT_ACCESS_SECRET", "dev_access_secret_change_me_in_prod_32chars!")
JWT_REFRESH_SECRET = os.getenv("JWT_REFRESH_SECRET", "dev_refresh_secret_change_me_in_prod_32chars!")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


# ── Hashing Utilities ──────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a password using Argon2id."""
    return argon2.using(type="ID").hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against an Argon2id hash. Falls back to bcrypt for legacy."""
    try:
        return argon2.verify(plain_password, hashed_password)
    except Exception:
        import bcrypt
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except Exception:
            return False


get_password_hash = hash_password


def hash_token(raw_token: str) -> str:
    """Hash a raw string or token using SHA-256."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


# ── JWT Tokens ───────────────────────────────────────────────────────────────

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create short-lived JWT access token (15 mins by default)."""
    to_encode = data.copy()
    to_encode.update({"type": "access"})
    now = datetime.utcnow()
    expire = now + (expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"iat": now, "exp": expire})
    return jwt.encode(to_encode, JWT_ACCESS_SECRET, algorithm=ALGORITHM)


def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create long-lived JWT refresh token (7 days by default)."""
    to_encode = data.copy()
    to_encode.update({"type": "refresh"})
    now = datetime.utcnow()
    expire = now + (expires_delta if expires_delta else timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"iat": now, "exp": expire})
    return jwt.encode(to_encode, JWT_REFRESH_SECRET, algorithm=ALGORITHM)


def decode_token(token: str, is_refresh: bool = False) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT access or refresh token."""
    secret = JWT_REFRESH_SECRET if is_refresh else JWT_ACCESS_SECRET
    expected_type = "refresh" if is_refresh else "access"
    try:
        payload = jwt.decode(token, secret, algorithms=[ALGORITHM])
        if payload.get("type") != expected_type:
            return None
        return payload
    except JWTError:
        return None


def decode_access_token(token: str) -> Dict[str, Any]:
    payload = decode_token(token, is_refresh=False)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


# ── Current User Dependency ─────────────────────────────────────────────────

async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: DBSession = Depends(get_db),
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token claims.")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User account not found.")

    if user.status == AccountStatus.SUSPENDED.value or user.status == AccountStatus.DISABLED.value:
        raise HTTPException(status_code=403, detail="Your account is not active.")

    return user


async def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user

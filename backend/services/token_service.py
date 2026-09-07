"""
Token Service — Generate, hash, and validate verification/reset tokens.
Tokens are NEVER stored raw in the database.
"""
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from backend.models.verification_token import VerificationToken, TokenType

EMAIL_VERIFY_EXPIRE_MINUTES = 60 * 24  # 24 hours
PASSWORD_RESET_EXPIRE_MINUTES = 30


def _hash_token(raw_token: str) -> str:
    """SHA-256 hash a token for secure storage."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def create_verification_token(
    db: Session,
    user_id: int,
    token_type: TokenType,
    expires_minutes: Optional[int] = None,
) -> str:
    """
    Generate a cryptographically secure token, store its hash in DB,
    and return the raw token (to embed in the email link).
    """
    raw_token = secrets.token_urlsafe(48)
    token_hash = _hash_token(raw_token)

    if not expires_minutes:
        expires_minutes = (
            EMAIL_VERIFY_EXPIRE_MINUTES
            if token_type == TokenType.EMAIL_VERIFY
            else PASSWORD_RESET_EXPIRE_MINUTES
        )

    # Invalidate any previous unused tokens of this type for this user
    db.query(VerificationToken).filter(
        VerificationToken.user_id == user_id,
        VerificationToken.token_type == token_type.value,
        VerificationToken.used_at.is_(None),
    ).update({"used_at": datetime.utcnow()})

    vt = VerificationToken(
        user_id=user_id,
        token_hash=token_hash,
        token_type=token_type.value,
        expires_at=datetime.utcnow() + timedelta(minutes=expires_minutes),
    )
    db.add(vt)
    db.commit()

    return raw_token


def validate_token(
    db: Session,
    raw_token: str,
    token_type: TokenType,
) -> Optional[VerificationToken]:
    """
    Validate a raw token: hash it, look up in DB, check expiry and used status.
    If valid, marks it as used (single-use) and returns the record.
    """
    token_hash = _hash_token(raw_token)
    vt = db.query(VerificationToken).filter(
        VerificationToken.token_hash == token_hash,
        VerificationToken.token_type == token_type.value,
    ).first()

    if not vt or vt.used_at is not None or datetime.utcnow() > vt.expires_at:
        return None

    vt.used_at = datetime.utcnow()
    db.commit()
    return vt


validate_verification_token = validate_token


def mark_token_used(db: Session, vt: VerificationToken) -> None:
    """Mark a token as used so it cannot be reused."""
    vt.used_at = datetime.utcnow()
    db.commit()

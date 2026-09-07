"""
Session Service — Manage user sessions and refresh-token rotation across multiple devices.
"""
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session as DBSession

from backend.models.session import Session
from backend.services.auth_service import hash_token

REFRESH_TOKEN_EXPIRE_DAYS = 7


def create_session(
    db: DBSession,
    user_id: int,
    refresh_token: str,
    device_name: Optional[str] = "Unknown Device",
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None
) -> Session:
    """Create a new active session with hashed refresh token."""
    token_hash = hash_token(refresh_token)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    session = Session(
        user_id=user_id,
        refresh_token_hash=token_hash,
        device_name=device_name or "Unknown Device",
        user_agent=user_agent,
        ip_address=ip_address,
        expires_at=expires_at
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def validate_and_rotate_session(
    db: DBSession,
    refresh_token: str,
    new_refresh_token: str,
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None
) -> Optional[Session]:
    """
    Validate an active session by refresh token.
    If valid, rotate refresh token hash and update last used timestamp.
    If revoked/expired or reused (token theft detection), handle securely.
    """
    token_hash = hash_token(refresh_token)
    session = db.query(Session).filter(Session.refresh_token_hash == token_hash).first()

    if not session:
        return None

    # Check if session was revoked or expired
    if session.revoked_at is not None or session.expires_at < datetime.utcnow():
        return None

    # Token rotation: replace hash with new token hash
    new_hash = hash_token(new_refresh_token)
    session.refresh_token_hash = new_hash
    session.last_used_at = datetime.utcnow()
    if user_agent:
        session.user_agent = user_agent
    if ip_address:
        session.ip_address = ip_address

    db.commit()
    db.refresh(session)
    return session


def revoke_session(db: DBSession, session_id: int, user_id: int) -> bool:
    """Revoke a specific session for a user."""
    session = db.query(Session).filter(
        Session.id == session_id,
        Session.user_id == user_id,
        Session.revoked_at == None
    ).first()
    if not session:
        return False

    session.revoked_at = datetime.utcnow()
    db.commit()
    return True


def revoke_all_sessions(db: DBSession, user_id: int, except_session_id: Optional[int] = None) -> int:
    """Revoke all sessions for a user, optionally keeping the current session active."""
    query = db.query(Session).filter(
        Session.user_id == user_id,
        Session.revoked_at == None
    )
    if except_session_id:
        query = query.filter(Session.id != except_session_id)

    sessions = query.all()
    now = datetime.utcnow()
    for session in sessions:
        session.revoked_at = now

    db.commit()
    return len(sessions)


def list_active_sessions(db: DBSession, user_id: int) -> List[Session]:
    """List all active non-expired non-revoked sessions for a user."""
    now = datetime.utcnow()
    return db.query(Session).filter(
        Session.user_id == user_id,
        Session.revoked_at == None,
        Session.expires_at > now
    ).order_by(Session.last_used_at.desc()).all()

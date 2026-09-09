"""
Google OAuth Service — Handle Google Authorization Code flow and UserInfo extraction.
"""
import os
from typing import Optional, Dict, Any
import httpx

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def _get_google_config():
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    redirect_uri = (
        os.getenv("GOOGLE_CALLBACK_URL") or os.getenv("GOOGLE_REDIRECT_URI") or "http://localhost:8000/api/auth/google/callback"
    ).strip()
    return client_id, client_secret, redirect_uri


def get_google_auth_url(state: str) -> str:
    """Generate the Google OAuth authorization URL."""
    client_id, _, redirect_uri = _get_google_config()
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    encoded_params = "&".join([f"{k}={v}" for k, v in params.items()])
    return f"{GOOGLE_AUTH_URL}?{encoded_params}"


async def get_google_tokens_and_user_info(code: str) -> Dict[str, Any]:
    """Exchange authorization code for tokens and retrieve user profile from Google."""
    client_id, client_secret, redirect_uri = _get_google_config()

    if not client_id or not client_secret:
        raise ValueError("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing from environment variables.")

    async with httpx.AsyncClient() as client:
        # Exchange code for access token
        token_res = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        if token_res.status_code != 200:
            raise ValueError(f"Google Token Exchange Error ({token_res.status_code}): {token_res.text}")

        token_data = token_res.json()
        access_token = token_data.get("access_token")

        if not access_token:
            raise ValueError("No access_token returned by Google.")

        # Fetch profile
        profile_res = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"}
        )

        if profile_res.status_code != 200:
            raise ValueError(f"Google UserInfo Error ({profile_res.status_code}): {profile_res.text}")

        user_info = profile_res.json()
        return {
            "sub": user_info.get("sub"),
            "email": user_info.get("email"),
            "email_verified": user_info.get("email_verified", True),
            "name": user_info.get("name"),
            "picture": user_info.get("picture"),
        }

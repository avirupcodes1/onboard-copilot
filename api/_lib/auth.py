"""Authentication: seeded accounts + stateless signed tokens.

Tokens are HMAC-signed (no external JWT dep, no server-side session store), so
auth works across Vercel serverless cold starts. Three roles: admin, mentor,
mentee. All demo accounts share the password `password123`.
"""
import base64
import hashlib
import hmac
import json
import os
import time
from typing import List, Optional

from .models import User

SECRET = os.getenv("SESSION_SECRET", "onboard-copilot-dev-secret-change-me").encode()
_SALT = b"onboard-copilot-salt-v1"
TOKEN_TTL = int(os.getenv("SESSION_TTL_SECONDS", str(7 * 24 * 3600)))  # 7 days
_PASSWORD = os.getenv("DEMO_PASSWORD", "password123")

# Seeded accounts. ids align with seed/people.json so display data joins cleanly.
_ACCOUNTS = [
    {"id": "admin-1", "name": "Alex Morgan", "email": "admin@northwind.example", "role": "admin", "team": "Operations", "initials": "AM"},
    {"id": "mentor-1", "name": "Sarah Chen", "email": "sarah@northwind.example", "role": "mentor", "team": "Engineering", "initials": "SC"},
    {"id": "mentor-2", "name": "Mike Johnson", "email": "mike@northwind.example", "role": "mentor", "team": "Sales", "initials": "MJ"},
    {"id": "mentor-3", "name": "Priya Patel", "email": "priya@northwind.example", "role": "mentor", "team": "Product", "initials": "PP"},
    {"id": "emp-1", "name": "Jordan Lee", "email": "jordan@northwind.example", "role": "mentee", "team": "Engineering", "mentor_id": "mentor-1", "initials": "JL"},
    {"id": "emp-2", "name": "Priya Kapoor", "email": "priyak@northwind.example", "role": "mentee", "team": "Product", "mentor_id": "mentor-3", "initials": "PK"},
    {"id": "emp-3", "name": "Marcus Stone", "email": "marcus@northwind.example", "role": "mentee", "team": "Sales", "mentor_id": "mentor-2", "initials": "MS"},
]


def _hash(pw: str) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), _SALT, 100_000)


_PW_HASH = _hash(_PASSWORD)
_BY_EMAIL = {a["email"]: a for a in _ACCOUNTS}
_BY_ID = {a["id"]: a for a in _ACCOUNTS}

# Accounts added at runtime (e.g. admin adds a new hire). In-memory, reset on
# cold start — consistent with the rest of the store. Default password123.
_RUNTIME: dict = {}


def _find_by_email(email: str):
    email = (email or "").strip().lower()
    if email in _BY_EMAIL:
        return _BY_EMAIL[email]
    return next((a for a in _RUNTIME.values() if a["email"] == email), None)


def _find_by_id(uid: str):
    return _BY_ID.get(uid) or _RUNTIME.get(uid)


def email_exists(email: str) -> bool:
    return _find_by_email(email) is not None


def register_account(user: dict) -> dict:
    acc = {**user, "email": (user.get("email") or "").strip().lower()}
    _RUNTIME[acc["id"]] = acc
    return acc


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def make_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": int(time.time()) + TOKEN_TTL}
    body = _b64(json.dumps(payload, separators=(",", ":")).encode())
    sig = _b64(hmac.new(SECRET, body.encode(), hashlib.sha256).digest())
    return f"{body}.{sig}"


def _verify_token(token: str) -> Optional[str]:
    try:
        body, sig = token.split(".")
        expected = _b64(hmac.new(SECRET, body.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(_unb64(body))
        if payload.get("exp", 0) < time.time():
            return None
        return payload.get("sub")
    except Exception:
        return None


def _to_user(acc: dict) -> User:
    return User(
        id=acc["id"], name=acc["name"], email=acc["email"], role=acc["role"],
        team=acc.get("team"), mentor_id=acc.get("mentor_id"), initials=acc.get("initials", ""),
    )


def authenticate(email: str, password: str) -> Optional[User]:
    acc = _find_by_email(email)
    if not acc:
        return None
    if not hmac.compare_digest(_hash(password), _PW_HASH):
        return None
    return _to_user(acc)


def user_from_token(token: Optional[str]) -> Optional[User]:
    if not token:
        return None
    uid = _verify_token(token)
    acc = _find_by_id(uid) if uid else None
    return _to_user(acc) if acc else None


def account(user_id: str) -> Optional[dict]:
    return _BY_ID.get(user_id)


def all_users() -> List[dict]:
    return [_to_user(a).model_dump() for a in _ACCOUNTS]

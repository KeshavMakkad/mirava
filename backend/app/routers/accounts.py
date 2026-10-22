"""Auth emails sent by Mirava itself.

Supabase's built-in mailer is limited to a few emails per hour, which broke
sign-up. Instead, the backend asks Supabase's Admin API to *generate* the
confirmation / magic-link / recovery token (no email is sent by Supabase) and
emails a link to our own /auth/confirm page, which exchanges the token for a
session with `supabase.auth.verifyOtp`.
"""

import re
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import select

from app.auth import DB
from app.config import get_settings
from app.models import Profile
from app.routers.ai import rate_limit
from app.services.email import auth_email, email_configured, send_email

router = APIRouter(prefix="/api/auth", tags=["auth"])

USERNAME_RE = re.compile(r"^[a-z0-9_]{3,24}$")
GENERIC_SENT = {"ok": True, "message": "If that email can be used, we've sent a link to it."}


class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    username: str
    display_name: str | None = Field(default=None, max_length=40)
    next: str | None = Field(default=None, max_length=200)

    @field_validator("username")
    @classmethod
    def _username(cls, v: str) -> str:
        v = v.strip().lower()
        if not USERNAME_RE.match(v):
            raise ValueError("Username must be 3–24 characters: a–z, 0–9 or _")
        return v


class EmailIn(BaseModel):
    email: EmailStr
    next: str | None = Field(default=None, max_length=200)


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    return fwd.split(",")[0].strip() or (request.client.host if request.client else "unknown")


def _site(request: Request) -> str:
    """Frontend origin for links: the caller's Origin if it's an allowed one."""
    s = get_settings()
    origin = (request.headers.get("origin") or "").rstrip("/")
    if origin and origin in s.cors_origins:
        return origin
    return (s.site_url or s.cors_origins[0]).rstrip("/")


def _safe_next(next_path: str | None) -> str | None:
    return next_path if next_path and next_path.startswith("/") and not next_path.startswith("//") else None


async def _generate_link(payload: dict) -> dict:
    s = get_settings()
    if not s.supabase_secret_key:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Accounts are not configured on this server")
    if not email_configured():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Email is not configured on this server")
    key = s.supabase_secret_key
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(
                f"{s.supabase_url.rstrip('/')}/auth/v1/admin/generate_link",
                json=payload,
                headers={"apikey": key, "Authorization": f"Bearer {key}"},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not reach the account service") from exc
    try:
        data = res.json()
    except ValueError:
        data = {}
    if res.status_code >= 300:
        code = str(data.get("error_code") or "")
        msg = str(data.get("msg") or data.get("message") or "")
        raise _AuthError(res.status_code, code, msg)
    # Response is the user object with link properties (top-level or under "properties").
    props = data.get("properties") or data
    token_hash = props.get("hashed_token")
    if not token_hash:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Account service returned no link")
    return {"token_hash": token_hash, "verification_type": props.get("verification_type")}


class _AuthError(Exception):
    def __init__(self, status_code: int, code: str, msg: str):
        self.status_code, self.code, self.msg = status_code, code, msg


def _confirm_url(request: Request, token_hash: str, kind: str, next_path: str | None) -> str:
    query = {"token_hash": token_hash, "type": kind}
    if next_path:
        query["next"] = next_path
    return f"{_site(request)}/auth/confirm?{urlencode(query)}"


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(body: SignupIn, request: Request, db: DB) -> dict:
    rate_limit(f"signup:{_client_ip(request)}", 10, 3600)
    if db.scalar(select(Profile.id).where(Profile.username == body.username)):
        raise HTTPException(status.HTTP_409_CONFLICT, "That username is taken")
    email = str(body.email).lower()
    try:
        link = await _generate_link({
            "type": "signup",
            "email": email,
            "password": body.password,
            "data": {"username": body.username, "display_name": (body.display_name or "").strip() or body.username},
        })
    except _AuthError as e:
        if e.code in ("email_exists", "user_already_exists") or "already" in e.msg.lower():
            raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists — log in instead") from None
        if e.code == "weak_password" or "password" in e.msg.lower():
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, e.msg or "Please choose a stronger password") from None
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Sign-up failed ({e.status_code})") from None

    url = _confirm_url(request, link["token_hash"], link["verification_type"] or "signup", _safe_next(body.next))
    html_body, text_body = auth_email(
        heading="Confirm your email",
        intro=f"Namaste {body.display_name or body.username}! Tap the button below to confirm your email and open Mirava.",
        button="Confirm my email",
        link=url,
        footer="If you didn't create a Mirava account, you can ignore this email.",
    )
    await send_email(email, "Confirm your Mirava account", html_body, text_body)
    return {"ok": True, "email": email}


@router.post("/magic-link")
async def magic_link(body: EmailIn, request: Request) -> dict:
    """Passwordless sign-in. Also confirms an unconfirmed account (acts as 'resend confirmation')."""
    email = str(body.email).lower()
    rate_limit(f"magic-ip:{_client_ip(request)}", 20, 3600)
    rate_limit(f"magic:{email}", 4, 3600)
    try:
        link = await _generate_link({"type": "magiclink", "email": email})
    except _AuthError:
        return GENERIC_SENT  # unknown email: don't reveal whether an account exists
    url = _confirm_url(request, link["token_hash"], link["verification_type"] or "magiclink", _safe_next(body.next))
    html_body, text_body = auth_email(
        heading="Your Mirava sign-in link",
        intro="Tap the button below to sign in. The link works once and expires in an hour.",
        button="Sign in to Mirava",
        link=url,
        footer="If you didn't ask to sign in, you can ignore this email.",
    )
    await send_email(email, "Sign in to Mirava", html_body, text_body)
    return GENERIC_SENT


@router.post("/password-reset")
async def password_reset(body: EmailIn, request: Request) -> dict:
    email = str(body.email).lower()
    rate_limit(f"reset-ip:{_client_ip(request)}", 20, 3600)
    rate_limit(f"reset:{email}", 4, 3600)
    try:
        link = await _generate_link({"type": "recovery", "email": email})
    except _AuthError:
        return GENERIC_SENT
    url = _confirm_url(request, link["token_hash"], link["verification_type"] or "recovery", "/reset-password")
    html_body, text_body = auth_email(
        heading="Reset your password",
        intro="Tap the button below to choose a new password for your Mirava account. The link expires in an hour.",
        button="Choose a new password",
        link=url,
        footer="If you didn't ask for a reset, you can ignore this email — your password won't change.",
    )
    await send_email(email, "Reset your Mirava password", html_body, text_body)
    return GENERIC_SENT

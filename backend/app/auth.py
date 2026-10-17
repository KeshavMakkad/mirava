"""Verifies Supabase access tokens and loads the caller's profile.

Supabase signs user JWTs either with asymmetric signing keys (ES256/RS256,
published at /auth/v1/.well-known/jwks.json — the default for new projects) or
with the legacy shared HS256 secret. Both are supported.
"""

import uuid
from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models import Profile

bearer = HTTPBearer(auto_error=False)


@lru_cache
def _jwks_client() -> jwt.PyJWKClient:
    url = get_settings().supabase_url.rstrip("/") + "/auth/v1/.well-known/jwks.json"
    return jwt.PyJWKClient(url, cache_keys=True, lifespan=3600)


def decode_token(token: str) -> dict:
    settings = get_settings()
    try:
        alg = jwt.get_unverified_header(token).get("alg")
        if alg == "HS256":
            if not settings.supabase_jwt_secret:
                raise jwt.InvalidTokenError("HS256 token but SUPABASE_JWT_SECRET is not configured")
            key: object = settings.supabase_jwt_secret
        else:
            key = _jwks_client().get_signing_key_from_jwt(token).key
        return jwt.decode(
            token,
            key,  # type: ignore[arg-type]
            algorithms=["HS256", "ES256", "RS256"],
            audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {exc}") from exc


@dataclass
class CurrentUser:
    id: uuid.UUID
    profile: Profile
    is_anonymous: bool

    @property
    def role(self) -> str:
        return self.profile.role


def _load_user(creds: HTTPAuthorizationCredentials | None, db: Session) -> CurrentUser | None:
    if creds is None:
        return None
    claims = decode_token(creds.credentials)
    user_id = uuid.UUID(claims["sub"])
    profile = db.get(Profile, user_id)
    if profile is None:
        # The signup trigger creates profiles; a missing one means the auth
        # user was created before migrations ran or the profile was deleted.
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Profile not found for this account")
    return CurrentUser(id=user_id, profile=profile, is_anonymous=bool(claims.get("is_anonymous")))


def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> CurrentUser:
    user = _load_user(creds, db)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    return user


def get_optional_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> CurrentUser | None:
    return _load_user(creds, db)


def require_roles(*roles: str):
    def checker(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Requires role: {', '.join(roles)}")
        return user

    return checker


def require_registered(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    """Rejects guest (anonymous) sessions."""
    if user.is_anonymous or user.profile.is_guest:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Create an account to use this feature")
    return user


AuthUser = Annotated[CurrentUser, Depends(get_current_user)]
OptionalUser = Annotated[CurrentUser | None, Depends(get_optional_user)]
RegisteredUser = Annotated[CurrentUser, Depends(require_registered)]
TeacherUser = Annotated[CurrentUser, Depends(require_roles("teacher", "admin"))]
AdminUser = Annotated[CurrentUser, Depends(require_roles("admin"))]
DB = Annotated[Session, Depends(get_db)]

import re
import uuid
from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from app.auth import DB, AuthUser
from app.models import Badge, PlayerBadge, Profile, UserState

router = APIRouter(prefix="/api/me", tags=["me"])

USERNAME_RE = re.compile(r"^[a-z0-9_]{3,24}$")
STATE_KEY_RE = re.compile(r"^[a-zA-Z0-9_.:-]{1,64}$")
MAX_STATE_BYTES = 64_000


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    display_name: str | None
    email: str | None
    role: str
    is_guest: bool
    avatar_url: str | None
    total_xp: int
    best_quiz_score: int
    daily_streak: int
    longest_streak: int
    total_questions: int
    total_correct: int
    perfect_quizzes: int
    created_at: datetime


class BadgeOut(BaseModel):
    badge_key: str
    name: str
    icon: str | None
    description: str | None
    unlocked_at: datetime


class MeOut(BaseModel):
    profile: ProfileOut
    badges: list[BadgeOut]
    rank: int | None


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=40)
    username: str | None = None
    avatar_url: str | None = Field(default=None, max_length=500)
    # Users may switch between the self-service roles; admin is granted manually.
    role: Literal["tourist", "student", "teacher"] | None = None

    @field_validator("username")
    @classmethod
    def _username(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip().lower()
        if not USERNAME_RE.match(v):
            raise ValueError("Username must be 3–24 characters: a–z, 0–9 or _")
        return v


def player_rank(db: DB, profile: Profile) -> int | None:
    if profile.is_guest:
        return None
    ahead = db.scalar(
        select(func.count()).select_from(Profile).where(
            Profile.is_guest.is_(False),
            (Profile.total_xp > profile.total_xp)
            | ((Profile.total_xp == profile.total_xp) & (Profile.best_quiz_score > profile.best_quiz_score)),
        )
    )
    return int(ahead or 0) + 1


@router.get("", response_model=MeOut)
def get_me(user: AuthUser, db: DB):
    rows = db.execute(
        select(Badge.badge_key, Badge.name, Badge.icon, Badge.description, PlayerBadge.unlocked_at)
        .join(PlayerBadge, PlayerBadge.badge_id == Badge.id)
        .where(PlayerBadge.player_id == user.id)
        .order_by(PlayerBadge.unlocked_at)
    ).mappings().all()
    return MeOut(
        profile=ProfileOut.model_validate(user.profile),
        badges=[BadgeOut(**r) for r in rows],
        rank=player_rank(db, user.profile),
    )


@router.patch("", response_model=ProfileOut)
def update_me(body: ProfileUpdate, user: AuthUser, db: DB):
    profile = user.profile
    if body.username and body.username != profile.username:
        taken = db.scalar(select(Profile.id).where(Profile.username == body.username, Profile.id != user.id))
        if taken:
            raise HTTPException(status.HTTP_409_CONFLICT, "That username is taken")
        profile.username = body.username
    if body.display_name is not None:
        profile.display_name = body.display_name.strip()
    if body.avatar_url is not None:
        profile.avatar_url = body.avatar_url or None
    if body.role is not None and profile.role != "admin":
        profile.role = body.role
    db.commit()
    db.refresh(profile)
    return profile


# ---- per-user key/value state (replaces legacy localStorage progress) -------

class StateIn(BaseModel):
    value: Any


def _check_key(key: str) -> None:
    if not STATE_KEY_RE.match(key):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid state key")


@router.get("/state")
def list_state(user: AuthUser, db: DB) -> dict[str, Any]:
    rows = db.scalars(select(UserState).where(UserState.user_id == user.id)).all()
    return {r.key: r.value for r in rows}


@router.get("/state/{key}")
def get_state(key: str, user: AuthUser, db: DB) -> dict[str, Any]:
    _check_key(key)
    row = db.get(UserState, (user.id, key))
    return {"key": key, "value": row.value if row else None}


@router.put("/state/{key}")
def put_state(key: str, body: StateIn, user: AuthUser, db: DB) -> dict[str, Any]:
    _check_key(key)
    if body.value is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Use DELETE to clear a state key")
    if len(body.model_dump_json()) > MAX_STATE_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "State value too large")
    stmt = insert(UserState).values(user_id=user.id, key=key, value=body.value)
    stmt = stmt.on_conflict_do_update(
        index_elements=[UserState.user_id, UserState.key],
        set_={"value": stmt.excluded.value, "updated_at": func.now()},
    )
    db.execute(stmt)
    db.commit()
    return {"key": key, "value": body.value}


@router.delete("/state/{key}", status_code=status.HTTP_204_NO_CONTENT)
def delete_state(key: str, user: AuthUser, db: DB) -> None:
    _check_key(key)
    row = db.get(UserState, (user.id, key))
    if row:
        db.delete(row)
        db.commit()

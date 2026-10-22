"""Score submission for the mini-games (Shivaji fort, Lost Legends, ...)."""

import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.auth import DB, AuthUser
from app.models import GameScore, Profile
from app.services.quiz import award_badges


@dataclass(frozen=True)
class GameRule:
    name: str
    max_score: int
    # XP granted per submission is min(score // xp_divisor, max_xp).
    xp_divisor: int
    max_xp: int
    completion_badge: str | None = None


# Caps keep a tampered client from posting absurd scores.
GAMES: dict[str, GameRule] = {
    "shivaji": GameRule("Shivaji's Fort", 100_000, 10, 200, "shivaji_warrior"),
    "lost-legends": GameRule("Lost Legends of Bharat", 100_000, 10, 200, "legend_finder"),
    "vedic-heist": GameRule("The Ancient Heist", 100_000, 10, 150),
    "vedic-sprint": GameRule("Vedic Maths Sprint", 10_000, 5, 100),
    "spot-difference": GameRule("Spot the Difference", 10_000, 5, 100),
    "rasoi-rescue": GameRule("Rasoi Rescue", 100_000, 10, 150),
    "jal-parampara": GameRule("JalParampara", 100_000, 10, 150),
    "quiz-arena": GameRule("Quiz Arena", 100_000, 10, 150),
    "vastu-plan": GameRule("VastuPlan AI", 100_000, 10, 150),
    "ahara-matrix": GameRule("Ahara Matrix", 100_000, 10, 100),
}

router = APIRouter(prefix="/api/games", tags=["games"])


class ScoreIn(BaseModel):
    score: int = Field(ge=0)
    level: int = Field(default=1, ge=1, le=1000)
    time_taken_seconds: int | None = Field(default=None, ge=0, le=86_400)
    completed: bool = False
    meta: dict[str, Any] = Field(default_factory=dict)


class ScoreOut(BaseModel):
    id: uuid.UUID
    game: str
    score: int
    best_score: int
    xp_earned: int
    total_xp: int
    new_badges: list[dict]
    completed_at: datetime


@router.get("")
def list_games() -> list[dict]:
    return [{"key": k, "name": g.name} for k, g in GAMES.items()]


@router.post("/{game}/scores", response_model=ScoreOut)
def submit_score(game: str, body: ScoreIn, user: AuthUser, db: DB):
    rule = GAMES.get(game)
    if rule is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown game")
    if body.score > rule.max_score:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Score out of range")
    if len(str(body.meta)) > 4000:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "meta too large")

    row = GameScore(
        player_id=user.id, game=game, score=body.score, level=body.level,
        time_taken_seconds=body.time_taken_seconds, meta={**body.meta, "completed": body.completed},
    )
    db.add(row)
    xp = min(body.score // rule.xp_divisor, rule.max_xp)
    profile: Profile = db.scalar(select(Profile).where(Profile.id == user.id).with_for_update())  # type: ignore[assignment]
    profile.total_xp += xp
    db.flush()
    new_badges = award_badges(db, user.id, [rule.completion_badge]) if body.completed and rule.completion_badge else []
    best = db.scalar(
        select(GameScore.score).where(GameScore.player_id == user.id, GameScore.game == game)
        .order_by(GameScore.score.desc()).limit(1)
    )
    db.commit()
    db.refresh(profile)
    return ScoreOut(
        id=row.id, game=game, score=row.score, best_score=best or row.score, xp_earned=xp,
        total_xp=profile.total_xp, new_badges=new_badges, completed_at=row.completed_at,
    )


@router.get("/{game}/scores/me")
def my_scores(game: str, user: AuthUser, db: DB, limit: int = 10) -> list[dict]:
    if game not in GAMES:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown game")
    rows = db.scalars(
        select(GameScore).where(GameScore.player_id == user.id, GameScore.game == game)
        .order_by(GameScore.completed_at.desc()).limit(min(limit, 50))
    ).all()
    return [
        {"score": r.score, "level": r.level, "time_taken_seconds": r.time_taken_seconds, "completed_at": r.completed_at}
        for r in rows
    ]

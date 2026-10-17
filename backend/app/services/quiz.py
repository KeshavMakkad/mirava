"""Daily quiz rules: question selection, per-answer scoring, streaks and badges.

Ported from legacy daily-quiz.js, but scoring now happens on the server: the
client never sees the correct answer before submitting, and answer time is
measured from when the server handed out the question.
"""

import hashlib
import math
import random
import uuid
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Profile, Question

TOTAL_DAILY = 10
SECONDS_PER_QUESTION = 15
# Allowance for network latency before an answer counts as timed out.
GRACE_SECONDS = 2.0


def quiz_today() -> date:
    return datetime.now(ZoneInfo(get_settings().quiz_timezone)).date()


def _rng_for(day: date, salt: str = "") -> random.Random:
    seed = int.from_bytes(hashlib.sha256(f"mirava:{day.isoformat()}:{salt}".encode()).digest()[:8], "big")
    return random.Random(seed)


def build_question_set(questions: list[Question], rng: random.Random, count: int = TOTAL_DAILY) -> list[dict]:
    """Pick `count` questions and shuffle each one's options, tracking the
    new index of the correct option."""
    picked = rng.sample(questions, min(count, len(questions)))
    out = []
    for q in picked:
        order = list(range(len(q.options)))
        rng.shuffle(order)
        out.append({
            "id": q.id,
            "options": [q.options[i] for i in order],
            "answer": order.index(q.answer),
        })
    return out


def daily_question_set(db: Session, day: date) -> list[dict]:
    """Every player gets the same 10 questions (in the same order) on a given day."""
    questions = db.scalars(select(Question).where(Question.is_active).order_by(Question.id)).all()
    return build_question_set(list(questions), _rng_for(day))


def points_for(correct: bool, seconds_taken: float, index: int) -> int:
    """10 base + speed bonus (1 per 3s left) + streak bonus (question index, max 4)."""
    if not correct:
        return 0
    time_left = max(0.0, SECONDS_PER_QUESTION - seconds_taken)
    return 10 + math.ceil(time_left / 3) + min(index, 4)


def next_streak(last_quiz_date: date | None, current_streak: int, today: date) -> int:
    if last_quiz_date == today:
        return current_streak
    if last_quiz_date == today - timedelta(days=1):
        return current_streak + 1
    return 1


def badges_earned(correct: int, total: int, elapsed_seconds: int, streak: int, perfect_quizzes: int) -> list[str]:
    keys = []
    if correct >= 8:
        keys.append("heritage_scholar")
    if correct == total:
        keys.append("perfect_explorer")
    if correct >= 8 and elapsed_seconds <= 90:
        keys.append("swift_scholar")
    if streak >= 7:
        keys.append("seven_day_streak")
    if streak >= 30:
        keys.append("heritage_legend")
    if perfect_quizzes >= 5:
        keys.append("five_perfects")
    return keys


def award_badges(db: Session, player_id: uuid.UUID, keys: list[str]) -> list[dict]:
    """Unlock badges the player doesn't have yet and add their XP reward.
    Returns the newly unlocked badges."""
    if not keys:
        return []
    rows = db.execute(
        text("""
            with wanted as (
                select id, badge_key, name, icon, description, xp_reward
                from badges where badge_key = any(:keys)
            ), inserted as (
                insert into player_badges (player_id, badge_id)
                select :pid, id from wanted
                on conflict (player_id, badge_id) do nothing
                returning badge_id
            )
            select w.badge_key, w.name, w.icon, w.description, w.xp_reward
            from wanted w join inserted i on i.badge_id = w.id
        """),
        {"keys": keys, "pid": player_id},
    ).mappings().all()
    xp = sum(r["xp_reward"] for r in rows)
    if xp:
        profile = db.get(Profile, player_id)
        if profile is not None:
            profile.total_xp += xp
    return [dict(r) for r in rows]

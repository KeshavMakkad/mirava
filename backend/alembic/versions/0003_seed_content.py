"""Seed badges and the 1,000-question heritage bank (from legacy quiz-bank.js).

Revision ID: 0003
Revises: 0002
"""

import json
from collections.abc import Sequence
from pathlib import Path

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0003"
down_revision: str | Sequence[str] | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

BANK_PATH = Path(__file__).resolve().parents[2] / "app" / "data" / "quiz_bank.json"

BADGES = [
    ("heritage_scholar", "Heritage Scholar", "Score 8/10 or higher in a daily quiz.", "📚", 50),
    ("perfect_explorer", "Perfect Explorer", "Get 10/10 in a daily quiz.", "🏆", 100),
    ("swift_scholar", "Swift Scholar", "Score 8/10+ in under 90 seconds.", "⚡", 75),
    ("seven_day_streak", "7-Day Streak", "Complete daily quizzes 7 days in a row.", "🔥", 150),
    ("heritage_legend", "Heritage Legend", "Maintain a 30-day streak.", "👑", 500),
    ("five_perfects", "Five Perfects", "Complete five perfect daily quizzes.", "💎", 200),
    ("legend_finder", "Legend Finder", "Complete Lost Legends of Bharat.", "🪔", 100),
    ("shivaji_warrior", "Shivaji's Warrior", "Finish the Shivaji fort challenge.", "⚔️", 100),
]

badges = sa.table(
    "badges",
    sa.column("badge_key", sa.Text), sa.column("name", sa.Text), sa.column("description", sa.Text),
    sa.column("icon", sa.Text), sa.column("xp_reward", sa.Integer),
)
questions = sa.table(
    "questions",
    sa.column("id", sa.Text), sa.column("topic", sa.Text), sa.column("question", sa.Text),
    sa.column("options", JSONB), sa.column("answer", sa.Integer), sa.column("difficulty", sa.Text),
    sa.column("source", sa.Text),
)


def upgrade() -> None:
    op.bulk_insert(badges, [
        {"badge_key": k, "name": n, "description": d, "icon": i, "xp_reward": xp} for k, n, d, i, xp in BADGES
    ])
    bank = json.loads(BANK_PATH.read_text(encoding="utf-8"))
    op.bulk_insert(questions, [{**q, "source": "bank"} for q in bank])


def downgrade() -> None:
    op.execute("delete from public.questions where source = 'bank'")
    keys = ", ".join(f"'{k}'" for k, *_ in BADGES)
    op.execute(f"delete from public.badges where badge_key in ({keys})")

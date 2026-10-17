"""SQLAlchemy models. Alembic migrations in ../alembic are the source of truth
for the schema; these mirror it for querying.

`profiles.id` is also a foreign key to Supabase's `auth.users(id)`; that
constraint (and the signup triggers on auth.users) live in the migration only,
since the `auth` schema is owned by Supabase and isn't part of this metadata.
"""

import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

ROLES = ("tourist", "student", "teacher", "admin")


def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))


def _created_at() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class Profile(Base):
    __tablename__ = "profiles"
    __table_args__ = (CheckConstraint("role in ('tourist','student','teacher','admin')", name="profiles_role_check"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    username: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(Text)
    role: Mapped[str] = mapped_column(Text, nullable=False, server_default="tourist")
    is_guest: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    total_xp: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    best_quiz_score: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    daily_streak: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    longest_streak: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    last_quiz_date: Mapped[date | None] = mapped_column(Date)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    total_correct: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    perfect_quizzes: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (CheckConstraint("source in ('bank','admin')", name="questions_source_check"),)

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    topic: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    answer: Mapped[int] = mapped_column(Integer, nullable=False)
    difficulty: Mapped[str] = mapped_column(Text, nullable=False, server_default="Explorer")
    source: Mapped[str] = mapped_column(Text, nullable=False, server_default="bank")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"), index=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = _created_at()


class QuizSession(Base):
    """A quiz in progress. Correct answers stay server-side and are revealed
    one question at a time, after the player has answered."""

    __tablename__ = "quiz_sessions"
    __table_args__ = (CheckConstraint("kind in ('daily','practice')", name="quiz_sessions_kind_check"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    player_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    quiz_date: Mapped[date] = mapped_column(Date, nullable=False)
    kind: Mapped[str] = mapped_column(Text, nullable=False, server_default="daily")
    # [{"id": "Q0001", "options": [...shuffled], "answer": 2}]
    questions: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    # [{"index": 0, "selected": 1, "correct": true, "points": 14, "seconds": 4.2}]
    answers: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    current_index: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    question_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime] = _created_at()
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    __table_args__ = (UniqueConstraint("player_id", "quiz_date"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    player_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    session_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("quiz_sessions.id", ondelete="SET NULL"))
    quiz_date: Mapped[date] = mapped_column(Date, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    correct_answers: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False, server_default="10")
    percentage: Mapped[float | None] = mapped_column(Numeric)
    time_taken_seconds: Mapped[int | None] = mapped_column(Integer)
    streak: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    completed_at: Mapped[datetime] = _created_at()


class Badge(Base):
    __tablename__ = "badges"

    id: Mapped[uuid.UUID] = _uuid_pk()
    badge_key: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    icon: Mapped[str | None] = mapped_column(Text)
    xp_reward: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")


class PlayerBadge(Base):
    __tablename__ = "player_badges"
    __table_args__ = (UniqueConstraint("player_id", "badge_id"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    player_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    badge_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("badges.id", ondelete="CASCADE"), nullable=False)
    unlocked_at: Mapped[datetime] = _created_at()


class GameScore(Base):
    __tablename__ = "game_scores"

    id: Mapped[uuid.UUID] = _uuid_pk()
    player_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    game: Mapped[str] = mapped_column(Text, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    level: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    time_taken_seconds: Mapped[int | None] = mapped_column(Integer)
    meta: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    completed_at: Mapped[datetime] = _created_at()


class UserState(Base):
    """Small per-user key/value store for mini-app progress (language
    lessons, personal bests...), replacing the legacy localStorage keys."""

    __tablename__ = "user_state"
    __table_args__ = (CheckConstraint("key ~ '^[a-zA-Z0-9_.:-]{1,64}$'", name="user_state_key_check"),)

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True)
    key: Mapped[str] = mapped_column(Text, primary_key=True)
    value: Mapped[Any] = mapped_column(JSONB, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class Classroom(Base):
    __tablename__ = "classrooms"

    id: Mapped[uuid.UUID] = _uuid_pk()
    teacher_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    class_name: Mapped[str] = mapped_column(Text, nullable=False)
    class_code: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    created_at: Mapped[datetime] = _created_at()


class ClassroomMember(Base):
    __tablename__ = "classroom_members"
    __table_args__ = (UniqueConstraint("classroom_id", "student_id"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    classroom_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    joined_at: Mapped[datetime] = _created_at()


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[uuid.UUID] = _uuid_pk()
    classroom_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False, index=True)
    teacher_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    # NULL = whole class
    student_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    question_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _created_at()


class AssignmentResult(Base):
    __tablename__ = "assignment_results"
    __table_args__ = (UniqueConstraint("assignment_id", "student_id"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    assignment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    correct_answers: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    answers: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    submitted_at: Mapped[datetime] = _created_at()


class News(Base):
    __tablename__ = "news"

    id: Mapped[uuid.UUID] = _uuid_pk()
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False, server_default="Heritage")
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

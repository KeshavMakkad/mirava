"""Administrator console: heritage news CMS, question bank, users, stats."""

import uuid
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator
from sqlalchemy import func, or_, select

from app.auth import DB, AdminUser
from app.models import GameScore, News, Profile, Question, QuizAttempt
from app.routers.me import ProfileOut

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ---- news --------------------------------------------------------------------------

class NewsIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    category: str = Field(default="Heritage", max_length=40)
    summary: str = Field(min_length=1, max_length=600)
    body: str | None = Field(default=None, max_length=20_000)
    image_url: HttpUrl | None = None
    source_url: HttpUrl | None = None
    published_at: datetime | None = None
    is_published: bool = True


class NewsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    category: str
    summary: str
    body: str | None
    image_url: str | None
    source_url: str | None
    published_at: datetime
    is_published: bool
    updated_at: datetime


def _news_values(body: NewsIn) -> dict:
    data = body.model_dump()
    data["image_url"] = str(body.image_url) if body.image_url else None
    data["source_url"] = str(body.source_url) if body.source_url else None
    data["published_at"] = body.published_at or datetime.now(UTC)
    return data


@router.get("/news", response_model=list[NewsOut])
def list_news(_: AdminUser, db: DB):
    return db.scalars(select(News).order_by(News.published_at.desc())).all()


@router.post("/news", response_model=NewsOut, status_code=status.HTTP_201_CREATED)
def create_news(body: NewsIn, user: AdminUser, db: DB):
    n = News(**_news_values(body), created_by=user.id)
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


@router.put("/news/{news_id}", response_model=NewsOut)
def update_news(news_id: uuid.UUID, body: NewsIn, _: AdminUser, db: DB):
    n = db.get(News, news_id)
    if n is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "News item not found")
    for k, v in _news_values(body).items():
        setattr(n, k, v)
    db.commit()
    db.refresh(n)
    return n


@router.delete("/news/{news_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_news(news_id: uuid.UUID, _: AdminUser, db: DB) -> None:
    n = db.get(News, news_id)
    if n:
        db.delete(n)
        db.commit()


# ---- questions ---------------------------------------------------------------------

class QuestionIn(BaseModel):
    topic: str = Field(min_length=1, max_length=80)
    question: str = Field(min_length=5, max_length=500)
    options: list[str] = Field(min_length=2, max_length=4)
    answer: int = Field(ge=0)
    difficulty: Literal["Explorer", "Scholar", "Master"] = "Explorer"
    is_active: bool = True

    @model_validator(mode="after")
    def _check(self):
        self.options = [o.strip() for o in self.options]
        if any(not o for o in self.options):
            raise ValueError("Options can't be empty")
        if self.answer >= len(self.options):
            raise ValueError("answer must index one of the options")
        return self


class QuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    topic: str
    question: str
    options: list[str]
    answer: int
    difficulty: str
    source: str
    is_active: bool
    created_at: datetime


@router.get("/questions")
def list_questions(
    _: AdminUser, db: DB,
    search: str | None = None, source: Literal["bank", "admin"] | None = None,
    limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
) -> dict:
    stmt = select(Question)
    if search:
        stmt = stmt.where(or_(Question.question.ilike(f"%{search}%"), Question.topic.ilike(f"%{search}%")))
    if source:
        stmt = stmt.where(Question.source == source)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(Question.created_at.desc(), Question.id).limit(limit).offset(offset)).all()
    return {"total": total, "items": [QuestionOut.model_validate(q) for q in rows]}


@router.post("/questions", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
def create_question(body: QuestionIn, user: AdminUser, db: DB):
    q = Question(id=f"ADM-{uuid.uuid4().hex[:10].upper()}", source="admin", created_by=user.id, **body.model_dump())
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


@router.put("/questions/{question_id}", response_model=QuestionOut)
def update_question(question_id: str, body: QuestionIn, _: AdminUser, db: DB):
    q = db.get(Question, question_id)
    if q is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    for k, v in body.model_dump().items():
        setattr(q, k, v)
    db.commit()
    db.refresh(q)
    return q


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: str, _: AdminUser, db: DB) -> None:
    """Soft delete: questions are deactivated so past quiz sessions and
    assignments that reference them keep working."""
    q = db.get(Question, question_id)
    if q is None:
        return
    q.is_active = False
    db.commit()


# ---- users -------------------------------------------------------------------------

class RoleIn(BaseModel):
    role: Literal["tourist", "student", "teacher", "admin"]


@router.get("/users")
def list_users(
    _: AdminUser, db: DB, search: str | None = None,
    limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
) -> dict:
    stmt = select(Profile)
    if search:
        stmt = stmt.where(or_(Profile.username.ilike(f"%{search}%"), Profile.email.ilike(f"%{search}%"),
                              Profile.display_name.ilike(f"%{search}%")))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(Profile.created_at.desc()).limit(limit).offset(offset)).all()
    return {"total": total, "items": [ProfileOut.model_validate(p) for p in rows]}


@router.patch("/users/{user_id}/role", response_model=ProfileOut)
def set_role(user_id: uuid.UUID, body: RoleIn, admin: AdminUser, db: DB):
    if user_id == admin.id and body.role != "admin":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't remove your own admin role")
    p = db.get(Profile, user_id)
    if p is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    p.role = body.role
    db.commit()
    db.refresh(p)
    return p


# ---- stats -------------------------------------------------------------------------

@router.get("/stats")
def stats(_: AdminUser, db: DB) -> dict:
    def count(stmt) -> int:
        return int(db.scalar(stmt) or 0)

    return {
        "users": count(select(func.count()).select_from(Profile).where(Profile.is_guest.is_(False))),
        "guests": count(select(func.count()).select_from(Profile).where(Profile.is_guest)),
        "teachers": count(select(func.count()).select_from(Profile).where(Profile.role == "teacher")),
        "questions_active": count(select(func.count()).select_from(Question).where(Question.is_active)),
        "questions_admin": count(select(func.count()).select_from(Question).where(Question.source == "admin")),
        "news_published": count(select(func.count()).select_from(News).where(News.is_published)),
        "quiz_attempts": count(select(func.count()).select_from(QuizAttempt)),
        "game_scores": count(select(func.count()).select_from(GameScore)),
        "last_news_at": db.scalar(select(func.max(News.updated_at))),
    }

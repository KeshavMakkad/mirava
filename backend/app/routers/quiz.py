"""Daily heritage quiz and topic practice.

Flow: start → (next → answer)×N → finish. The server stamps when each question
is handed out, so answer time can't be faked, and the correct option is only
revealed in the response to `answer`.
"""

import random
import uuid
from datetime import UTC, date, datetime

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from app.auth import DB, AuthUser
from app.models import Profile, Question, QuizAttempt, QuizSession
from app.services import quiz as engine

router = APIRouter(prefix="/api/quiz", tags=["quiz"])

PRACTICE_XP_PER_CORRECT = 2


class QuestionOut(BaseModel):
    id: str
    topic: str
    question: str
    options: list[str]
    difficulty: str


class AnswerRecord(BaseModel):
    index: int
    selected: int | None
    correct: bool
    correct_index: int
    points: int


class SessionOut(BaseModel):
    session_id: uuid.UUID
    kind: str
    quiz_date: date
    total: int
    seconds_per_question: int
    index: int
    score: int
    answers: list[AnswerRecord]
    question: QuestionOut | None
    # Seconds remaining on `question` (it may have been served before a reload).
    time_left: float | None
    finished: bool


class AttemptOut(BaseModel):
    quiz_date: date
    score: int
    correct_answers: int
    total_questions: int
    time_taken_seconds: int | None
    streak: int
    completed_at: datetime


class DailyStatus(BaseModel):
    quiz_date: date
    total: int
    seconds_per_question: int
    attempt: AttemptOut | None
    in_progress_session: uuid.UUID | None


class AnswerIn(BaseModel):
    index: int = Field(ge=0)
    # null = the player let the timer run out
    selected: int | None = Field(default=None, ge=0)


class FinishOut(BaseModel):
    kind: str
    score: int
    correct_answers: int
    total_questions: int
    time_taken_seconds: int
    streak: int | None
    best_score: int
    total_xp: int
    xp_earned: int
    new_badges: list[dict]
    answers: list[AnswerRecord]


class PracticeIn(BaseModel):
    topic: str | None = None
    difficulty: str | None = None
    count: int = Field(default=10, ge=1, le=20)


def _now() -> datetime:
    return datetime.now(UTC)


def _get_session(db: DB, session_id: uuid.UUID, user_id: uuid.UUID) -> QuizSession:
    s = db.scalar(select(QuizSession).where(QuizSession.id == session_id).with_for_update())
    if s is None or s.player_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quiz session not found")
    return s


def _question_out(db: DB, s: QuizSession, i: int) -> QuestionOut:
    item = s.questions[i]
    q = db.get(Question, item["id"])
    return QuestionOut(
        id=item["id"],
        topic=q.topic if q else "Heritage",
        question=q.question if q else "",
        options=item["options"],
        difficulty=q.difficulty if q else "Explorer",
    )


def _answers_out(s: QuizSession) -> list[AnswerRecord]:
    return [
        AnswerRecord(
            index=a["index"], selected=a["selected"], correct=a["correct"],
            correct_index=s.questions[a["index"]]["answer"], points=a["points"],
        )
        for a in s.answers
    ]


def _session_out(db: DB, s: QuizSession) -> SessionOut:
    question = None
    time_left = None
    # A question is "live" once served and until answered.
    if s.question_started_at is not None and len(s.answers) == s.current_index < len(s.questions):
        question = _question_out(db, s, s.current_index)
        elapsed = (_now() - s.question_started_at).total_seconds()
        time_left = max(0.0, engine.SECONDS_PER_QUESTION - elapsed)
    return SessionOut(
        session_id=s.id,
        kind=s.kind,
        quiz_date=s.quiz_date,
        total=len(s.questions),
        seconds_per_question=engine.SECONDS_PER_QUESTION,
        index=s.current_index,
        score=sum(a["points"] for a in s.answers),
        answers=_answers_out(s),
        question=question,
        time_left=time_left,
        finished=s.finished_at is not None,
    )


def _serve_next(s: QuizSession) -> None:
    """Start the clock on the next unanswered question (idempotent)."""
    if s.finished_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Quiz already finished")
    if len(s.answers) != s.current_index:
        raise HTTPException(status.HTTP_409_CONFLICT, "Session out of sync")
    if s.current_index >= len(s.questions):
        return
    if s.question_started_at is None:
        s.question_started_at = _now()


# ---- daily -----------------------------------------------------------------

@router.get("/daily/status", response_model=DailyStatus)
def daily_status(user: AuthUser, db: DB):
    today = engine.quiz_today()
    attempt = db.scalar(select(QuizAttempt).where(QuizAttempt.player_id == user.id, QuizAttempt.quiz_date == today))
    session_id = None
    if attempt is None:
        session_id = db.scalar(
            select(QuizSession.id).where(
                QuizSession.player_id == user.id, QuizSession.quiz_date == today,
                QuizSession.kind == "daily", QuizSession.finished_at.is_(None),
            )
        )
    return DailyStatus(
        quiz_date=today,
        total=engine.TOTAL_DAILY,
        seconds_per_question=engine.SECONDS_PER_QUESTION,
        attempt=AttemptOut.model_validate(attempt, from_attributes=True) if attempt else None,
        in_progress_session=session_id,
    )


@router.post("/daily/start", response_model=SessionOut)
def start_daily(user: AuthUser, db: DB):
    """Start today's quiz, or resume it (with the same timer) after a reload."""
    today = engine.quiz_today()
    if db.scalar(select(QuizAttempt.id).where(QuizAttempt.player_id == user.id, QuizAttempt.quiz_date == today)):
        raise HTTPException(status.HTTP_409_CONFLICT, "You've already completed today's quiz. Come back tomorrow!")
    s = db.scalar(
        select(QuizSession).where(
            QuizSession.player_id == user.id, QuizSession.quiz_date == today,
            QuizSession.kind == "daily", QuizSession.finished_at.is_(None),
        ).with_for_update()
    )
    if s is None:
        questions = engine.daily_question_set(db, today)
        if not questions:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "The question bank is empty")
        s = QuizSession(player_id=user.id, quiz_date=today, kind="daily", questions=questions, answers=[])
        db.add(s)
        db.flush()
    _serve_next(s)
    db.commit()
    return _session_out(db, s)


# ---- practice ----------------------------------------------------------------

@router.get("/topics")
def topics(db: DB) -> list[dict]:
    from sqlalchemy import func

    rows = db.execute(
        select(Question.topic, func.count()).where(Question.is_active).group_by(Question.topic).order_by(Question.topic)
    ).all()
    return [{"topic": t, "count": c} for t, c in rows]


@router.post("/practice/start", response_model=SessionOut)
def start_practice(body: PracticeIn, user: AuthUser, db: DB):
    stmt = select(Question).where(Question.is_active)
    if body.topic:
        stmt = stmt.where(Question.topic == body.topic)
    if body.difficulty:
        stmt = stmt.where(Question.difficulty == body.difficulty)
    pool = list(db.scalars(stmt).all())
    if not pool:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No questions match those filters")
    questions = engine.build_question_set(pool, random.Random(), body.count)
    s = QuizSession(player_id=user.id, quiz_date=engine.quiz_today(), kind="practice", questions=questions, answers=[])
    db.add(s)
    db.flush()
    _serve_next(s)
    db.commit()
    return _session_out(db, s)


# ---- shared session flow ------------------------------------------------------

@router.get("/sessions/{session_id}", response_model=SessionOut)
def get_session(session_id: uuid.UUID, user: AuthUser, db: DB):
    return _session_out(db, _get_session(db, session_id, user.id))


@router.post("/sessions/{session_id}/answer", response_model=AnswerRecord)
def answer(session_id: uuid.UUID, body: AnswerIn, user: AuthUser, db: DB):
    s = _get_session(db, session_id, user.id)
    if s.finished_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Quiz already finished")
    if body.index != s.current_index or len(s.answers) != s.current_index or s.question_started_at is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "That question isn't active")
    item = s.questions[body.index]
    if body.selected is not None and body.selected >= len(item["options"]):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Invalid option")

    seconds = (_now() - s.question_started_at).total_seconds()
    timed_out = seconds > engine.SECONDS_PER_QUESTION + engine.GRACE_SECONDS
    selected = None if timed_out else body.selected
    correct = selected is not None and selected == item["answer"]
    points = engine.points_for(correct, seconds, body.index)

    s.answers = [*s.answers, {
        "index": body.index, "selected": selected, "correct": correct,
        "points": points, "seconds": round(seconds, 2),
    }]
    flag_modified(s, "answers")
    s.current_index += 1
    s.question_started_at = None
    db.commit()
    return AnswerRecord(index=body.index, selected=selected, correct=correct, correct_index=item["answer"], points=points)


@router.post("/sessions/{session_id}/next", response_model=SessionOut)
def next_question(session_id: uuid.UUID, user: AuthUser, db: DB):
    s = _get_session(db, session_id, user.id)
    _serve_next(s)
    db.commit()
    return _session_out(db, s)


@router.post("/sessions/{session_id}/finish", response_model=FinishOut)
def finish(session_id: uuid.UUID, user: AuthUser, db: DB):
    s = _get_session(db, session_id, user.id)
    if s.finished_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Quiz already finished")
    if len(s.answers) < len(s.questions):
        raise HTTPException(status.HTTP_409_CONFLICT, "Answer every question first")

    now = _now()
    s.finished_at = now
    total = len(s.questions)
    correct = sum(1 for a in s.answers if a["correct"])
    score = sum(a["points"] for a in s.answers)
    elapsed = max(1, round((now - s.started_at).total_seconds()))
    profile: Profile = db.scalar(select(Profile).where(Profile.id == user.id).with_for_update())  # type: ignore[assignment]

    profile.total_questions += total
    profile.total_correct += correct
    new_badges: list[dict] = []
    streak: int | None = None

    if s.kind == "daily":
        if db.scalar(select(QuizAttempt.id).where(QuizAttempt.player_id == user.id, QuizAttempt.quiz_date == s.quiz_date)):
            raise HTTPException(status.HTTP_409_CONFLICT, "Today's quiz is already recorded")
        streak = engine.next_streak(profile.last_quiz_date, profile.daily_streak, s.quiz_date)
        profile.daily_streak = streak
        profile.longest_streak = max(profile.longest_streak, streak)
        profile.last_quiz_date = s.quiz_date
        profile.best_quiz_score = max(profile.best_quiz_score, score)
        if correct == total:
            profile.perfect_quizzes += 1
        xp_earned = score
        db.add(QuizAttempt(
            player_id=user.id, session_id=s.id, quiz_date=s.quiz_date, score=score,
            correct_answers=correct, total_questions=total,
            percentage=round(100 * correct / total, 1), time_taken_seconds=elapsed, streak=streak,
        ))
    else:
        xp_earned = correct * PRACTICE_XP_PER_CORRECT

    profile.total_xp += xp_earned
    db.flush()
    if s.kind == "daily":
        keys = engine.badges_earned(correct, total, elapsed, streak or 0, profile.perfect_quizzes)
        new_badges = engine.award_badges(db, user.id, keys)
    db.commit()
    db.refresh(profile)

    return FinishOut(
        kind=s.kind, score=score, correct_answers=correct, total_questions=total,
        time_taken_seconds=elapsed, streak=streak, best_score=profile.best_quiz_score,
        total_xp=profile.total_xp, xp_earned=xp_earned, new_badges=new_badges, answers=_answers_out(s),
    )

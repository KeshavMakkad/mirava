"""Teacher classrooms, student membership and homework assignments."""

import secrets
import string
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select

from app.auth import DB, AuthUser, RegisteredUser, TeacherUser
from app.models import Assignment, AssignmentResult, Classroom, ClassroomMember, Profile, Question

router = APIRouter(prefix="/api", tags=["classrooms"])

MAX_QUESTIONS_PER_ASSIGNMENT = 10
MAX_ASSIGNMENTS_PER_DAY = 10
POINTS_PER_QUESTION = 10
CODE_ALPHABET = string.ascii_uppercase + string.digits


# ---- schemas -------------------------------------------------------------------

class ClassroomIn(BaseModel):
    class_name: str = Field(min_length=1, max_length=80)


class JoinIn(BaseModel):
    class_code: str = Field(min_length=4, max_length=12)


class Member(BaseModel):
    student_id: uuid.UUID
    username: str
    display_name: str | None
    total_xp: int
    joined_at: datetime


class ClassroomOut(BaseModel):
    id: uuid.UUID
    class_name: str
    class_code: str
    teacher_id: uuid.UUID
    teacher_name: str | None
    member_count: int
    created_at: datetime


class ClassroomDetail(ClassroomOut):
    members: list[Member]


class AssignmentIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    question_ids: list[str] = Field(min_length=1, max_length=MAX_QUESTIONS_PER_ASSIGNMENT)
    # Omit to assign to the whole class.
    student_id: uuid.UUID | None = None
    due_in_hours: int | None = Field(default=48, ge=1, le=24 * 30)


class ResultSummary(BaseModel):
    student_id: uuid.UUID
    student_name: str | None
    score: int
    correct_answers: int
    total_questions: int
    submitted_at: datetime


class AssignmentOut(BaseModel):
    id: uuid.UUID
    classroom_id: uuid.UUID
    class_name: str | None = None
    title: str
    description: str | None
    student_id: uuid.UUID | None
    question_count: int
    max_points: int
    due_at: datetime | None
    created_at: datetime
    status: str  # assigned | completed | expired
    my_result: ResultSummary | None = None
    results: list[ResultSummary] | None = None  # teacher view


class HomeworkQuestion(BaseModel):
    id: str
    topic: str
    question: str
    options: list[str]
    difficulty: str


class SubmitIn(BaseModel):
    # One selected option index per question (null = skipped), in order.
    answers: list[int | None]


class ReviewItem(BaseModel):
    id: str
    question: str
    options: list[str]
    selected: int | None
    correct_index: int
    correct: bool


class SubmitOut(BaseModel):
    score: int
    correct_answers: int
    total_questions: int
    review: list[ReviewItem]


# ---- helpers ---------------------------------------------------------------------

def _new_code(db: DB) -> str:
    for _ in range(10):
        code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))
        if not db.scalar(select(Classroom.id).where(Classroom.class_code == code)):
            return code
    raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not allocate a class code")


def _classroom_out(db: DB, c: Classroom) -> ClassroomOut:
    teacher = db.get(Profile, c.teacher_id)
    count = db.scalar(select(func.count()).select_from(ClassroomMember).where(ClassroomMember.classroom_id == c.id)) or 0
    return ClassroomOut(
        id=c.id, class_name=c.class_name, class_code=c.class_code, teacher_id=c.teacher_id,
        teacher_name=teacher.display_name if teacher else None, member_count=count, created_at=c.created_at,
    )


def _owned_classroom(db: DB, classroom_id: uuid.UUID, user: AuthUser) -> Classroom:
    c = db.get(Classroom, classroom_id)
    if c is None or (c.teacher_id != user.id and user.role != "admin"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Classroom not found")
    return c


def _is_member(db: DB, classroom_id: uuid.UUID, student_id: uuid.UUID) -> bool:
    return bool(db.scalar(select(ClassroomMember.id).where(
        ClassroomMember.classroom_id == classroom_id, ClassroomMember.student_id == student_id)))


def _status(a: Assignment, done: bool) -> str:
    if done:
        return "completed"
    if a.due_at and a.due_at < datetime.now(UTC):
        return "expired"
    return "assigned"


def _result_summary(r: AssignmentResult, name: str | None) -> ResultSummary:
    return ResultSummary(student_id=r.student_id, student_name=name, score=r.score,
                         correct_answers=r.correct_answers, total_questions=r.total_questions,
                         submitted_at=r.submitted_at)


def _assignment_out(a: Assignment, **extra) -> AssignmentOut:
    n = len(a.question_ids)
    return AssignmentOut(
        id=a.id, classroom_id=a.classroom_id, title=a.title, description=a.description, student_id=a.student_id,
        question_count=n, max_points=n * POINTS_PER_QUESTION, due_at=a.due_at, created_at=a.created_at, **extra,
    )


def _student_can_see(db: DB, a: Assignment, student_id: uuid.UUID) -> bool:
    if a.student_id is not None:
        return a.student_id == student_id
    return _is_member(db, a.classroom_id, student_id)


# ---- classrooms ------------------------------------------------------------------

@router.post("/classrooms", response_model=ClassroomOut, status_code=status.HTTP_201_CREATED)
def create_classroom(body: ClassroomIn, user: TeacherUser, db: DB):
    c = Classroom(teacher_id=user.id, class_name=body.class_name.strip(), class_code=_new_code(db))
    db.add(c)
    db.commit()
    return _classroom_out(db, c)


@router.get("/classrooms", response_model=list[ClassroomOut])
def my_classrooms(user: AuthUser, db: DB):
    """Teachers see classrooms they own; everyone sees classrooms they've joined."""
    joined = select(ClassroomMember.classroom_id).where(ClassroomMember.student_id == user.id)
    rows = db.scalars(
        select(Classroom).where(or_(Classroom.teacher_id == user.id, Classroom.id.in_(joined)))
        .order_by(Classroom.created_at.desc())
    ).all()
    return [_classroom_out(db, c) for c in rows]


@router.get("/classrooms/{classroom_id}", response_model=ClassroomDetail)
def classroom_detail(classroom_id: uuid.UUID, user: TeacherUser, db: DB):
    c = _owned_classroom(db, classroom_id, user)
    rows = db.execute(
        select(Profile.id, Profile.username, Profile.display_name, Profile.total_xp, ClassroomMember.joined_at)
        .join(ClassroomMember, ClassroomMember.student_id == Profile.id)
        .where(ClassroomMember.classroom_id == c.id)
        .order_by(Profile.display_name)
    ).all()
    members = [Member(student_id=r[0], username=r[1], display_name=r[2], total_xp=r[3], joined_at=r[4]) for r in rows]
    return ClassroomDetail(**_classroom_out(db, c).model_dump(), members=members)


@router.delete("/classrooms/{classroom_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_classroom(classroom_id: uuid.UUID, user: TeacherUser, db: DB) -> None:
    db.delete(_owned_classroom(db, classroom_id, user))
    db.commit()


@router.delete("/classrooms/{classroom_id}/members/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(classroom_id: uuid.UUID, student_id: uuid.UUID, user: TeacherUser, db: DB) -> None:
    c = _owned_classroom(db, classroom_id, user)
    m = db.scalar(select(ClassroomMember).where(ClassroomMember.classroom_id == c.id, ClassroomMember.student_id == student_id))
    if m:
        db.delete(m)
        db.commit()


@router.post("/classrooms/join", response_model=ClassroomOut)
def join_classroom(body: JoinIn, user: RegisteredUser, db: DB):
    c = db.scalar(select(Classroom).where(Classroom.class_code == body.class_code.strip().upper()))
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No classroom with that code")
    if c.teacher_id == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You teach this classroom")
    if not _is_member(db, c.id, user.id):
        db.add(ClassroomMember(classroom_id=c.id, student_id=user.id))
        if user.profile.role == "tourist":
            user.profile.role = "student"
        db.commit()
    return _classroom_out(db, c)


@router.post("/classrooms/{classroom_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_classroom(classroom_id: uuid.UUID, user: AuthUser, db: DB) -> None:
    m = db.scalar(select(ClassroomMember).where(ClassroomMember.classroom_id == classroom_id, ClassroomMember.student_id == user.id))
    if m:
        db.delete(m)
        db.commit()


# ---- question bank for teachers ---------------------------------------------------

@router.get("/questions")
def browse_questions(
    user: TeacherUser, db: DB,
    search: str | None = None, topic: str | None = None, difficulty: str | None = None,
    limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
) -> dict:
    stmt = select(Question).where(Question.is_active)
    if search:
        stmt = stmt.where(Question.question.ilike(f"%{search}%") | Question.topic.ilike(f"%{search}%"))
    if topic:
        stmt = stmt.where(Question.topic == topic)
    if difficulty:
        stmt = stmt.where(Question.difficulty == difficulty)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(Question.id).limit(limit).offset(offset)).all()
    return {
        "total": total,
        "items": [
            {"id": q.id, "topic": q.topic, "question": q.question, "options": q.options,
             "answer": q.answer, "difficulty": q.difficulty, "source": q.source}
            for q in rows
        ],
    }


# ---- assignments -----------------------------------------------------------------

@router.post("/classrooms/{classroom_id}/assignments", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
def create_assignment(classroom_id: uuid.UUID, body: AssignmentIn, user: TeacherUser, db: DB):
    c = _owned_classroom(db, classroom_id, user)
    since = datetime.now(UTC) - timedelta(days=1)
    today_count = db.scalar(select(func.count()).select_from(Assignment).where(
        Assignment.teacher_id == user.id, Assignment.created_at >= since)) or 0
    if today_count >= MAX_ASSIGNMENTS_PER_DAY:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS,
                            f"Daily limit reached: up to {MAX_ASSIGNMENTS_PER_DAY} assignments per day")
    ids = list(dict.fromkeys(body.question_ids))
    found = set(db.scalars(select(Question.id).where(Question.id.in_(ids), Question.is_active)).all())
    missing = [i for i in ids if i not in found]
    if missing:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Unknown questions: {', '.join(missing[:5])}")
    if body.student_id and not _is_member(db, c.id, body.student_id):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "That student isn't in this classroom")
    a = Assignment(
        classroom_id=c.id, teacher_id=user.id, student_id=body.student_id, title=body.title.strip(),
        description=body.description, question_ids=ids,
        due_at=datetime.now(UTC) + timedelta(hours=body.due_in_hours) if body.due_in_hours else None,
    )
    db.add(a)
    db.commit()
    return _assignment_out(a, class_name=c.class_name, status="assigned", results=[])


@router.get("/classrooms/{classroom_id}/assignments", response_model=list[AssignmentOut])
def classroom_assignments(classroom_id: uuid.UUID, user: TeacherUser, db: DB):
    c = _owned_classroom(db, classroom_id, user)
    assignments = db.scalars(select(Assignment).where(Assignment.classroom_id == c.id).order_by(Assignment.created_at.desc())).all()
    out = []
    for a in assignments:
        rows = db.execute(
            select(AssignmentResult, Profile.display_name)
            .join(Profile, Profile.id == AssignmentResult.student_id)
            .where(AssignmentResult.assignment_id == a.id)
        ).all()
        results = [_result_summary(r, name) for r, name in rows]
        done = bool(results) and a.student_id is not None
        out.append(_assignment_out(a, class_name=c.class_name, status=_status(a, done), results=results))
    return out


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(assignment_id: uuid.UUID, user: TeacherUser, db: DB) -> None:
    a = db.get(Assignment, assignment_id)
    if a is None or (a.teacher_id != user.id and user.role != "admin"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    db.delete(a)
    db.commit()


@router.get("/assignments", response_model=list[AssignmentOut])
def my_homework(user: AuthUser, db: DB):
    """Assignments for the current student: personal ones plus whole-class ones."""
    joined = select(ClassroomMember.classroom_id).where(ClassroomMember.student_id == user.id)
    rows = db.execute(
        select(Assignment, Classroom.class_name)
        .join(Classroom, Classroom.id == Assignment.classroom_id)
        .where(or_(Assignment.student_id == user.id,
                   (Assignment.student_id.is_(None)) & Assignment.classroom_id.in_(joined)))
        .order_by(Assignment.created_at.desc())
    ).all()
    out = []
    for a, class_name in rows:
        r = db.scalar(select(AssignmentResult).where(AssignmentResult.assignment_id == a.id, AssignmentResult.student_id == user.id))
        out.append(_assignment_out(
            a, class_name=class_name, status=_status(a, r is not None),
            my_result=_result_summary(r, user.profile.display_name) if r else None,
        ))
    return out


@router.get("/assignments/{assignment_id}/questions", response_model=list[HomeworkQuestion])
def homework_questions(assignment_id: uuid.UUID, user: AuthUser, db: DB):
    a = db.get(Assignment, assignment_id)
    if a is None or not _student_can_see(db, a, user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    qs = {q.id: q for q in db.scalars(select(Question).where(Question.id.in_(a.question_ids))).all()}
    return [
        HomeworkQuestion(id=q.id, topic=q.topic, question=q.question, options=q.options, difficulty=q.difficulty)
        for qid in a.question_ids if (q := qs.get(qid))
    ]


def _review(a: Assignment, db: DB, answers: list[int | None]) -> list[ReviewItem]:
    qs = {q.id: q for q in db.scalars(select(Question).where(Question.id.in_(a.question_ids))).all()}
    review = []
    for i, qid in enumerate(a.question_ids):
        q = qs.get(qid)
        if q is None:
            continue
        sel = answers[i] if i < len(answers) else None
        review.append(ReviewItem(id=q.id, question=q.question, options=q.options, selected=sel,
                                 correct_index=q.answer, correct=sel == q.answer))
    return review


@router.post("/assignments/{assignment_id}/submit", response_model=SubmitOut)
def submit_homework(assignment_id: uuid.UUID, body: SubmitIn, user: AuthUser, db: DB):
    a = db.get(Assignment, assignment_id)
    if a is None or not _student_can_see(db, a, user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    if a.due_at and a.due_at < datetime.now(UTC):
        raise HTTPException(status.HTTP_409_CONFLICT, "This assignment has expired")
    if db.scalar(select(AssignmentResult.id).where(AssignmentResult.assignment_id == a.id, AssignmentResult.student_id == user.id)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Already submitted")
    if len(body.answers) != len(a.question_ids):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Answer count doesn't match the assignment")

    review = _review(a, db, body.answers)
    correct = sum(1 for r in review if r.correct)
    score = correct * POINTS_PER_QUESTION
    db.add(AssignmentResult(assignment_id=a.id, student_id=user.id, score=score, correct_answers=correct,
                            total_questions=len(review), answers=body.answers))
    user.profile.total_xp += score
    user.profile.total_questions += len(review)
    user.profile.total_correct += correct
    db.commit()
    return SubmitOut(score=score, correct_answers=correct, total_questions=len(review), review=review)


@router.get("/assignments/{assignment_id}/review", response_model=SubmitOut)
def review_homework(assignment_id: uuid.UUID, user: AuthUser, db: DB):
    a = db.get(Assignment, assignment_id)
    if a is None or not _student_can_see(db, a, user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    r = db.scalar(select(AssignmentResult).where(AssignmentResult.assignment_id == a.id, AssignmentResult.student_id == user.id))
    if r is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not submitted yet")
    return SubmitOut(score=r.score, correct_answers=r.correct_answers, total_questions=r.total_questions,
                     review=_review(a, db, r.answers))

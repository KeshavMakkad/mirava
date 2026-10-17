import uuid
import datetime as dt

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text

from app.auth import DB, OptionalUser
from app.routers.games import GAMES
from app.services.quiz import quiz_today

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


class Entry(BaseModel):
    rank: int
    player_id: uuid.UUID
    username: str
    display_name: str | None
    avatar_url: str | None
    score: int
    detail: dict
    is_me: bool = False


class Board(BaseModel):
    board: str
    date: dt.date | None = None
    entries: list[Entry]
    me: Entry | None = None


def _board(rows, me_id: uuid.UUID | None, score_key: str, detail_keys: list[str]) -> tuple[list[Entry], Entry | None]:
    entries, me = [], None
    for r in rows:
        e = Entry(
            rank=r["rank"], player_id=r["player_id"], username=r["username"], display_name=r["display_name"],
            avatar_url=r["avatar_url"], score=r[score_key], detail={k: r[k] for k in detail_keys},
            is_me=r["player_id"] == me_id,
        )
        if e.is_me:
            me = e
        entries.append(e)
    return entries, me


@router.get("/global", response_model=Board)
def global_board(user: OptionalUser, db: DB, limit: int = Query(50, ge=1, le=200)):
    me_id = user.id if user else None
    rows = db.execute(
        text("""
            select * from global_leaderboard
            where rank <= :limit or player_id = :me
            order by rank
        """),
        {"limit": limit, "me": me_id},
    ).mappings().all()
    entries, me = _board(rows, me_id, "total_xp", ["best_quiz_score", "daily_streak", "badges_count"])
    return Board(board="global", entries=[e for e in entries if e.rank <= limit], me=me)


@router.get("/daily", response_model=Board)
def daily_board(user: OptionalUser, db: DB, limit: int = Query(50, ge=1, le=200), day: dt.date | None = None):
    day = day or quiz_today()
    me_id = user.id if user else None
    rows = db.execute(
        text("""
            with ranked as (
                select row_number() over (order by qa.score desc, qa.correct_answers desc, qa.completed_at) as rank,
                       p.id as player_id, p.username, p.display_name, p.avatar_url,
                       qa.score, qa.correct_answers, qa.time_taken_seconds
                from quiz_attempts qa join profiles p on p.id = qa.player_id
                where qa.quiz_date = :day and not p.is_guest
            )
            select * from ranked where rank <= :limit or player_id = :me order by rank
        """),
        {"day": day, "limit": limit, "me": me_id},
    ).mappings().all()
    entries, me = _board(rows, me_id, "score", ["correct_answers", "time_taken_seconds"])
    return Board(board="daily", date=day, entries=[e for e in entries if e.rank <= limit], me=me)


@router.get("/games/{game}", response_model=Board)
def game_board(game: str, user: OptionalUser, db: DB, limit: int = Query(50, ge=1, le=200)):
    if game not in GAMES:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown game")
    me_id = user.id if user else None
    rows = db.execute(
        text("""
            with best as (
                select distinct on (gs.player_id) gs.player_id, gs.score, gs.level, gs.time_taken_seconds, gs.completed_at
                from game_scores gs
                where gs.game = :game
                order by gs.player_id, gs.score desc, gs.time_taken_seconds asc nulls last, gs.completed_at
            ), ranked as (
                select row_number() over (order by b.score desc, b.time_taken_seconds asc nulls last, b.completed_at) as rank,
                       p.id as player_id, p.username, p.display_name, p.avatar_url,
                       b.score, b.level, b.time_taken_seconds
                from best b join profiles p on p.id = b.player_id
                where not p.is_guest
            )
            select * from ranked where rank <= :limit or player_id = :me order by rank
        """),
        {"game": game, "limit": limit, "me": me_id},
    ).mappings().all()
    entries, me = _board(rows, me_id, "score", ["level", "time_taken_seconds"])
    return Board(board=game, entries=[e for e in entries if e.rank <= limit], me=me)

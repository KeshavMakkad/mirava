from fastapi import APIRouter, Query
from sqlalchemy import select

from app.auth import DB
from app.models import News
from app.routers.admin import NewsOut

router = APIRouter(prefix="/api/news", tags=["news"])


@router.get("", response_model=list[NewsOut])
def published_news(db: DB, limit: int = Query(10, ge=1, le=50)):
    return db.scalars(
        select(News).where(News.is_published).order_by(News.published_at.desc()).limit(limit)
    ).all()

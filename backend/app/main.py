from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import get_settings
from app.db import engine
from app.routers import accounts, admin, ai, games, leaderboard, me, news, quiz, rasoi, sentinel

app = FastAPI(title="Mirava API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["Content-Type"],
)

for r in (accounts, me, quiz, leaderboard, games, news, admin, ai, rasoi, sentinel):
    app.include_router(r.router)


@app.get("/api/health", tags=["health"])
def health() -> dict:
    with engine.connect() as conn:
        conn.execute(text("select 1"))
    return {"status": "ok"}

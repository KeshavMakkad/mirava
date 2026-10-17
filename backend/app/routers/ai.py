"""Server-side proxy to OpenRouter so the API key never reaches the browser.

Used by the AI heritage guide, the "talk to the king" chat and Bhasha's AI
translation mode. Contract matches what legacy Bhasha expected from
`MIRAVA_AI_ENDPOINT`: POST {system, messages} → {reply}.
"""

import time
from collections import defaultdict, deque
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.auth import AuthUser
from app.config import get_settings

router = APIRouter(prefix="/api/ai", tags=["ai"])

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

PERSONAS = {
    "guide": (
        "You are Mirava's AI Guide, an expert on Indian heritage, culture, history, festivals, "
        "languages, art and monuments. Answer warmly and accurately in under 150 words. "
        "If unsure, say so rather than inventing facts."
    ),
    "king": (
        "You are a historical Indian ruler speaking with a curious visitor inside the Mirava heritage atlas. "
        "Stay in character, speak with dignity and warmth, ground every answer in documented history, "
        "and keep replies under 120 words."
    ),
    "translator": (
        "You are Mirava Bhasha, an expert translator of Indian languages, ancient and modern."
    ),
}

_calls: dict[str, deque[float]] = defaultdict(deque)


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatIn(BaseModel):
    messages: list[Message] = Field(min_length=1, max_length=20)
    persona: Literal["guide", "king", "translator"] = "guide"
    # Extra task-specific instructions appended to the persona prompt
    # (e.g. Bhasha's source/target language rules, or which king to play).
    system: str | None = Field(default=None, max_length=4000)
    max_tokens: int = Field(default=400, ge=16, le=1200)


class ChatOut(BaseModel):
    reply: str


def _rate_limit(user_key: str) -> None:
    limit = get_settings().ai_requests_per_minute
    now = time.monotonic()
    q = _calls[user_key]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many AI requests — try again in a minute")
    q.append(now)


@router.post("/chat", response_model=ChatOut)
async def chat(body: ChatIn, user: AuthUser) -> ChatOut:
    settings = get_settings()
    if not settings.openrouter_api_key:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "AI is not configured on this server")
    _rate_limit(str(user.id))

    system = PERSONAS[body.persona] + (f"\n\n{body.system}" if body.system else "")
    payload = {
        "model": settings.openrouter_model,
        "max_tokens": body.max_tokens,
        "temperature": 0.7,
        "messages": [{"role": "system", "content": system}, *[m.model_dump() for m in body.messages]],
    }
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "HTTP-Referer": settings.cors_origins[0] if settings.cors_origins else "https://mirava.in",
        "X-Title": "Mirava",
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.post(OPENROUTER_URL, json=payload, headers=headers)
    except httpx.HTTPError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not reach the AI provider") from exc
    if res.status_code != 200:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"AI provider error ({res.status_code})")
    try:
        reply = res.json()["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, ValueError) as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Unexpected AI response") from exc
    return ChatOut(reply=reply.strip())

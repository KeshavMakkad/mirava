"""Sentinel: AI visual screening of a monument photo (vision model via OpenRouter)."""

import re

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.auth import AuthUser
from app.config import get_settings
from app.routers.ai import openrouter_chat, rate_limit, require_ai

router = APIRouter(prefix="/api/sentinel", tags=["sentinel"])

IMAGE_RE = re.compile(r"^data:image/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$")
SCANS_PER_DAY = 12

SYSTEM = (
    "You are MIRAVA Sentinel, a cautious image-based heritage assessment assistant. First decide if image visibly "
    "depicts a monument or historical built heritage; if not, explicitly state NOT A MONUMENT and explain visible "
    "evidence. If unclear state UNCERTAIN. For likely monuments identify only actually visible suspected cracks and "
    "structural damage; mark MINOR or MAJOR with rationale (length, thickness, displacement, junction, erosion, extent), "
    "state uncertainty, avoid ungrounded measurements. No engineering diagnosis; suggest on-site qualified conservator inspection."
)
ADVISORY = (
    "AI screening only; false positives and false negatives are possible. "
    "No automated analysis establishes structural safety."
)


class VisionIn(BaseModel):
    # ~2.4 MB of image bytes once base64-encoded.
    image: str = Field(max_length=3_200_000)


@router.post("/vision")
async def vision(body: VisionIn, user: AuthUser) -> dict:
    require_ai("Sentinel AI is not configured on this server.")
    if not IMAGE_RE.match(body.image):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Upload one JPEG, PNG or WebP under 2.4 MB.")
    rate_limit(f"sentinel:{user.id}", SCANS_PER_DAY, 86_400)
    assessment = await openrouter_chat(
        [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": [
                {"type": "text", "text": "Check monument status, visible surface anomalies, and reasoned severity classifications."},
                {"type": "image_url", "image_url": {"url": body.image}},
            ]},
        ],
        model=get_settings().sentinel_vision_model, max_tokens=550, temperature=0.1, timeout=25,
    )
    return {"assessment": assessment[:3900] or "No visual assessment returned.", "advisory": ADVISORY}

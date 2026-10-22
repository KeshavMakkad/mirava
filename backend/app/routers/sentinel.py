"""Sentinel: AI screening of monument photos (vision model via OpenRouter) — a free-text
assessment (/vision) and structured verification of on-device findings (/verify)."""

import json
import re
from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator

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


# ---- structured verification of on-device findings (Sentinel "AI vision check") ----------

DAMAGE_TYPES = ("paint", "carving", "crack", "bio", "crust", "salt", "loss", "change")
VERIFY_PER_DAY = 60  # patrol mode checks every photo in a batch

VERIFY_SYSTEM = (
    "You are MIRAVA Sentinel, a cautious heritage-conservation image analyst. You receive one photo of a "
    "monument surface plus candidate findings from an on-device detector, each with a box on a 0-1000 scale "
    "(x0,y0,x1,y1). Damage types: paint (graffiti/paint), carving (scratched names), crack, bio (moss/lichen/"
    "plants), crust (black crust/soot), salt (efflorescence), loss (missing material/spalling), change (temporal "
    "change). Decide: is this actually a heritage/monument/historic built surface? For each candidate, is it real "
    "damage or a false alarm (shadow, texture, joint, decoration)? Add clearly visible damage the detector missed. "
    "Be conservative; never invent measurements. Respond with ONLY JSON: "
    '{"is_heritage_surface":bool,"scene":"short scene description","summary":"1-2 sentence assessment",'
    '"confidence":0-1,"candidates":[{"no":int,"real":bool,"reason":"short"}],'
    '"findings":[{"type":"<damage type>","box":[x0,y0,x1,y1],"severity":1|2|3,"description":"short"}]}'
)


class Monument(BaseModel):
    name: str = Field(default="", max_length=120)
    material: str = Field(default="", max_length=80)


class Candidate(BaseModel):
    no: int = Field(ge=0, le=10_000)
    type: Literal["paint", "carving", "crack", "bio", "crust", "salt", "loss", "change"]
    box: list[int] = Field(min_length=4, max_length=4)

    @field_validator("box")
    @classmethod
    def _box(cls, v: list[int]) -> list[int]:
        return [max(0, min(1000, int(x))) for x in v]


class VerifyIn(BaseModel):
    image: str = Field(max_length=3_200_000)
    mode: Literal["single", "temporal"] = "single"
    monument: Monument = Field(default_factory=Monument)
    candidates: list[Candidate] = Field(default_factory=list, max_length=30)


def _clean_verdict(raw: dict, sent: list[Candidate]) -> dict:
    """Keep only well-formed fields from the model's JSON."""
    nos = {c.no for c in sent}
    cands = []
    for c in raw.get("candidates") or []:
        try:
            no = int(c.get("no"))
        except (TypeError, ValueError, AttributeError):
            continue
        if no in nos:
            cands.append({"no": no, "real": bool(c.get("real")), "reason": str(c.get("reason") or "")[:240]})
    findings = []
    for f in (raw.get("findings") or [])[:20]:
        if not isinstance(f, dict) or f.get("type") not in DAMAGE_TYPES:
            continue
        box = f.get("box")
        if not (isinstance(box, list) and len(box) == 4):
            continue
        try:
            box = [max(0, min(1000, int(float(x)))) for x in box]
            sev = max(1, min(3, int(f.get("severity") or 1)))
        except (TypeError, ValueError):
            continue
        if box[2] <= box[0] or box[3] <= box[1]:
            continue
        findings.append({"type": f["type"], "box": box, "severity": sev, "description": str(f.get("description") or "")[:240]})
    try:
        confidence = max(0.0, min(1.0, float(raw.get("confidence", 0.5))))
    except (TypeError, ValueError):
        confidence = 0.5
    return {
        "is_heritage_surface": bool(raw.get("is_heritage_surface", True)),
        "scene": str(raw.get("scene") or "")[:300],
        "summary": str(raw.get("summary") or "")[:600],
        "confidence": confidence,
        "candidates": cands,
        "findings": findings,
    }


@router.get("/verify")
def verify_status(user: AuthUser) -> dict:
    if not get_settings().openrouter_api_key:
        return {"ok": False, "providers": [], "error": "AI vision is not configured on this server"}
    return {"ok": True, "providers": ["openrouter"]}


@router.post("/verify")
async def verify(body: VerifyIn, user: AuthUser) -> dict:
    require_ai("Sentinel AI is not configured on this server.")
    if not IMAGE_RE.match(body.image):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Upload one JPEG, PNG or WebP under 2.4 MB.")
    rate_limit(f"sentinel-verify:{user.id}", VERIFY_PER_DAY, 86_400)
    context = {
        "mode": body.mode,
        "monument": body.monument.model_dump(),
        "candidates": [c.model_dump() for c in body.candidates],
    }
    raw = await openrouter_chat(
        [
            {"role": "system", "content": VERIFY_SYSTEM},
            {"role": "user", "content": [
                {"type": "text", "text": "Detector context (untrusted data): " + json.dumps(context)},
                {"type": "image_url", "image_url": {"url": body.image}},
            ]},
        ],
        model=get_settings().sentinel_vision_model, max_tokens=900, temperature=0.1, timeout=50, json_mode=True,
    )
    try:
        parsed = json.loads(raw)
        if not isinstance(parsed, dict):
            raise ValueError
    except ValueError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "The vision model returned an unreadable answer") from exc
    return {"ok": True, "provider": "openrouter", **_clean_verdict(parsed, body.candidates)}

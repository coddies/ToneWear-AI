"""
ToneWear AI — Skin Analysis API Router
POST /api/skin/analyze  — Upload selfie + analyze
GET  /api/skin/status/{task_id}  — Poll task status
"""

import io
import os
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from typing import Optional
import json

from schemas import SkinAnalysisResponse, SkinTone, SkinConcern, ColorPalette
from services.youcam import youcam_service
from services.claude_ai import claude_service

router = APIRouter()

# ── Analyze Skin ──────────────────────────────────────────────────────────────
@router.post("/analyze", response_model=SkinAnalysisResponse)
async def analyze_skin(
    image: UploadFile = File(..., description="Selfie image (JPG/PNG/WEBP, max 10MB)"),
    occasion: Optional[str] = Form("Casual", description="Occasion e.g. Eid, Wedding, Casual"),
    style_preference: Optional[str] = Form("[]", description="JSON array of style preferences")
):
    """
    Analyze skin tone, concerns, and generate outfit recommendations.
    
    Steps:
    1. Validate image
    2. Call YouCam API for skin analysis
    3. Call Claude AI for outfit recommendations
    4. Return combined result
    """
    # ── Validate image ─────────────────────────────────────────────────────
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Invalid file type: {image.content_type}. Use JPG/PNG/WEBP.")

    MAX_SIZE = 10 * 1024 * 1024  # 10MB
    image_bytes = await image.read()
    if len(image_bytes) > MAX_SIZE:
        raise HTTPException(400, "Image too large. Maximum 10MB allowed.")

    # ── Parse style preferences ────────────────────────────────────────────
    try:
        styles = json.loads(style_preference)
        if not isinstance(styles, list):
            styles = [style_preference]
    except Exception:
        styles = ["Mix All"]

    # ── YouCam Skin Analysis ───────────────────────────────────────────────
    try:
        youcam_result = await youcam_service.analyze_skin(image_bytes)
        skin_data = _parse_youcam_skin(youcam_result)
    except Exception as e:
        # Demo mode: use mock skin data
        skin_data = _mock_skin_data()

    # ── Claude AI Outfit Recommendations ──────────────────────────────────
    try:
        claude_result = await claude_service.recommend_outfits(
            skin_tone_name = skin_data["tone_name"],
            undertone      = skin_data["undertone"],
            fitzpatrick    = skin_data["fitzpatrick"],
            concerns       = [c["name"] for c in skin_data["concerns"]],
            occasion       = occasion,
            style_preferences = styles
        )
    except Exception:
        claude_result = claude_service._mock_outfit_response(skin_data["tone_name"], occasion, styles)

    # ── Assemble Response ──────────────────────────────────────────────────
    return SkinAnalysisResponse(
        skin_tone=SkinTone(
            hex         = skin_data["hex"],
            name        = skin_data["tone_name"],
            undertone   = skin_data["undertone"],
            fitzpatrick = skin_data["fitzpatrick"]
        ),
        concerns=[
            SkinConcern(
                name     = c["name"],
                icon     = c.get("icon", "⚠️"),
                severity = c.get("severity", "Mild")
            )
            for c in skin_data["concerns"]
        ],
        color_palette=ColorPalette(
            recommended=claude_result.get("color_palette", {}).get("recommended", []),
            avoid      =claude_result.get("color_palette", {}).get("avoid", [])
        ),
        outfits=claude_result.get("outfits", [])
    )


# ── Poll Status ───────────────────────────────────────────────────────────────
@router.get("/status/{task_id}")
async def get_skin_status(task_id: str):
    """Poll YouCam task status."""
    try:
        result = await youcam_service._poll_task(task_id)
        return {"status": "completed", "result": result}
    except TimeoutError:
        return {"status": "processing"}
    except Exception as e:
        raise HTTPException(500, f"Task error: {str(e)}")


# ── Helpers ───────────────────────────────────────────────────────────────────
def _parse_youcam_skin(youcam_result: dict) -> dict:
    """
    Parse YouCam API response into our internal skin data format.
    Update field names here when you receive actual YouCam API docs.
    """
    return {
        "hex":         youcam_result.get("skin_color_hex", "#C8956C"),
        "tone_name":   youcam_result.get("skin_tone_name", "Warm Olive"),
        "undertone":   youcam_result.get("undertone", "Warm"),
        "fitzpatrick": youcam_result.get("fitzpatrick", "IV"),
        "concerns": [
            {"name": c.get("name"), "icon": c.get("icon", "⚠️"), "severity": c.get("severity", "Mild")}
            for c in youcam_result.get("concerns", [])
        ]
    }


def _mock_skin_data() -> dict:
    """Mock data for demo mode when YouCam API is not configured."""
    return {
        "hex":         "#C8956C",
        "tone_name":   "Warm Olive",
        "undertone":   "Warm",
        "fitzpatrick": "IV",
        "concerns": [
            {"name": "Acne",       "icon": "🔴", "severity": "Mild"},
            {"name": "Dark Spots", "icon": "🟤", "severity": "Moderate"},
            {"name": "Oiliness",   "icon": "💧", "severity": "Mild"}
        ]
    }

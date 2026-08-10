"""
ToneWear AI — Recommendations API
POST /api/recommendations  →  RAG + Claude ranked product list
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class StyleProfile(BaseModel):
    skin_tone: str = "Medium"
    undertone: str = "warm"
    fitzpatrick: str = "IV"
    concerns: list[str] = []
    recommended_colors: list[str] = []
    color_families: list[str] = []
    style_directions: list[str] = []
    avoid_colors: list[str] = []


class RecommendationRequest(BaseModel):
    profile: StyleProfile
    occasion: str = ""
    budget: Optional[int] = None
    gender: str = "Male"
    query: str = ""
    top_n: int = 6


# ── POST /api/recommendations ─────────────────────────────────────────────────
@router.post("")
async def get_recommendations(req: RecommendationRequest):
    """
    RAG + Claude recommendation pipeline.
    Returns ranked products with match scores and explanations.
    """
    try:
        from services.recommendation_service import recommendation_service

        result = await recommendation_service.get_recommendations(
            profile=req.profile.model_dump(),
            occasion=req.occasion,
            budget=req.budget,
            gender=req.gender,
            query=req.query,
            top_n=req.top_n
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation error: {str(e)}")

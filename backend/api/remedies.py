"""
ToneWear AI — Remedies API Router
POST /api/remedies/get  — Generate AI remedies for selected skin concerns
"""

from fastapi import APIRouter, HTTPException
from schemas import RemediesRequest
from services.claude_ai import claude_service

router = APIRouter()


# ── Get Remedies ──────────────────────────────────────────────────────────────
@router.post("/get")
async def get_remedies(request: RemediesRequest):
    """
    Generate AI-powered skin remedies for selected concerns.
    
    - Claude AI generates 3 home remedies per concern
    - Uses ingredients popular in South Asian/Middle Eastern households
    - Includes clothing advice to minimize visual impact
    
    DISCLAIMER: AI-generated suggestions only. Consult a dermatologist.
    """
    valid_concerns = {
        "Acne", "Dark Spots", "Oily Skin",
        "Dry Skin", "Uneven Skin Tone", "Dark Circles"
    }

    # Validate concerns
    invalid = set(request.concerns) - valid_concerns
    if invalid:
        raise HTTPException(400, f"Invalid concerns: {invalid}. Valid: {valid_concerns}")

    if not request.concerns:
        raise HTTPException(400, "At least one concern required")

    try:
        result = await claude_service.generate_remedies(request.concerns)
        return result
    except Exception as e:
        # Return mock data on any error
        return claude_service._mock_remedies(request.concerns)

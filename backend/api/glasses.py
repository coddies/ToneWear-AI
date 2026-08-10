"""
ToneWear AI — Glasses API Router
POST /api/glasses/analyze  — Analyze face shape + get frame recommendations
POST /api/glasses/tryon    — Virtual glasses try-on
"""

from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from schemas import GlassesAnalysisResponse, TryOnResponse
from services.youcam import youcam_service
from services.claude_ai import claude_service

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE      = 10 * 1024 * 1024


async def _read_image(upload: UploadFile) -> bytes:
    if upload.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Invalid file type: {upload.content_type}")
    data = await upload.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(400, "Image too large. Max 10MB.")
    return data


# ── Analyze Face + Recommend Frames ──────────────────────────────────────────
@router.post("/analyze", response_model=GlassesAnalysisResponse)
async def analyze_glasses(
    face_image: UploadFile = File(..., description="Front-facing face photo")
):
    """
    Analyze face shape + skin tone → generate frame recommendations.
    
    Steps:
    1. YouCam detects face shape + skin tone from photo
    2. Claude AI generates personalized frame recommendations
    3. Returns: face_shape, frame_colors, recommended_frames, care_tips
    """
    face_bytes = await _read_image(face_image)

    # ── Face shape detection (YouCam) ─────────────────────────────────────
    face_shape = "Oval"
    skin_tone  = "Warm Olive"
    undertone  = "Warm"

    try:
        youcam_result = await youcam_service.glasses_tryon(face_bytes, frame_image_url="")
        face_shape = youcam_result.get("face_shape", "Oval")
        skin_tone  = youcam_result.get("skin_tone_name", "Warm Olive")
        undertone  = youcam_result.get("undertone", "Warm")
    except Exception:
        pass  # Fall through to Claude with defaults

    # ── Claude AI frame recommendations ───────────────────────────────────
    try:
        claude_result = await claude_service.recommend_glasses(face_shape, skin_tone, undertone)
    except Exception:
        claude_result = claude_service._mock_glasses_response(face_shape, skin_tone, undertone)

    return GlassesAnalysisResponse(
        face_shape={
            "shape":       face_shape,
            "description": _get_face_description(face_shape)
        },
        frame_colors       = claude_result.get("frame_colors", []),
        recommended_frames = claude_result.get("recommended_frames", []),
        care_tips          = claude_result.get("care_tips", [])
    )


# ── Virtual Glasses Try-On ────────────────────────────────────────────────────
@router.post("/tryon", response_model=TryOnResponse)
async def glasses_tryon(
    face_image:    UploadFile = File(..., description="Face photo"),
    frame_image_url: str      = Form("", description="URL of glasses frame image")
):
    """Apply selected glasses frame to face photo."""
    face_bytes = await _read_image(face_image)

    try:
        result = await youcam_service.glasses_tryon(face_bytes, frame_image_url)
        return TryOnResponse(result_url=result.get("result_url", "/static/demo-glasses.jpg"))
    except Exception:
        return TryOnResponse(result_url="/static/demo-glasses.jpg")


# ── Face Shape Descriptions ───────────────────────────────────────────────────
def _get_face_description(shape: str) -> str:
    descriptions = {
        "Oval":    "Oval faces are the most versatile — nearly all frame shapes will complement your balanced proportions.",
        "Round":   "Round faces benefit from angular frames that add structure and definition to soft curves.",
        "Square":  "Square faces are flattered by round or oval frames that soften the angular jawline.",
        "Heart":   "Heart faces suit frames that are wider at the bottom to balance a wider forehead.",
        "Diamond": "Diamond faces look great with oval or rimless frames that highlight the eyes.",
        "Oblong":  "Oblong faces benefit from wider frames or decorative temples to add visual width."
    }
    return descriptions.get(shape, "Your unique face shape opens up many stylish frame options.")

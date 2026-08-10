"""
ToneWear AI — Virtual Try-On API Router
POST /api/tryon/generate  — Try outfit from URL on user photo
POST /api/tryon/custom    — Try user's own clothing on their photo
"""

from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from schemas import TryOnResponse
from services.youcam import youcam_service

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE      = 10 * 1024 * 1024  # 10MB


async def _read_image(upload: UploadFile) -> bytes:
    if upload.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Invalid file type: {upload.content_type}")
    data = await upload.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(400, "Image too large. Max 10MB.")
    return data


# ── Generate Try-On (Recommended Outfit) ──────────────────────────────────────
@router.post("/generate", response_model=TryOnResponse)
async def generate_tryon(
    user_image: UploadFile = File(..., description="User selfie/full-body photo"),
    outfit_image_url: str  = Form(..., description="URL of outfit image")
):
    """
    Virtual try-on using YouCam API.
    Takes user photo + outfit image URL → returns result image URL.
    """
    user_bytes = await _read_image(user_image)

    try:
        result_url = await youcam_service.virtual_tryon(
            person_image_bytes  = user_bytes,
            clothing_image_url  = outfit_image_url
        )
        return TryOnResponse(result_url=result_url)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        # Demo mode: return a placeholder
        return TryOnResponse(result_url="/static/demo-tryon.jpg")


# ── Custom Try-On (User's Own Clothes) ───────────────────────────────────────
@router.post("/custom", response_model=TryOnResponse)
async def custom_tryon(
    user_image:      UploadFile = File(..., description="User selfie/full-body photo"),
    clothing_image:  UploadFile = File(..., description="Photo of user's clothing item")
):
    """
    Try-on with user's own clothing.
    Takes user photo + clothing photo → returns result image URL.
    """
    user_bytes     = await _read_image(user_image)
    clothing_bytes = await _read_image(clothing_image)

    try:
        result_url = await youcam_service.virtual_tryon(
            person_image_bytes   = user_bytes,
            clothing_image_bytes = clothing_bytes
        )
        return TryOnResponse(result_url=result_url)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        return TryOnResponse(result_url="/static/demo-tryon.jpg")

"""
ToneWear AI — Pydantic Schemas
All request/response models for API validation
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from enum import Enum


# ── Enums ────────────────────────────────────────────────────────────────────
class Occasion(str, Enum):
    eid         = "Eid"
    wedding     = "Wedding"
    interview   = "Interview"
    university  = "University"
    casual      = "Casual"
    date        = "Date"
    office      = "Office"
    graduation  = "Graduation"


class StylePreference(str, Enum):
    pakistani_indian = "Pakistani/Indian"
    middle_eastern   = "Middle Eastern"
    western          = "Western"
    mix_all          = "Mix All"


class FaceShape(str, Enum):
    oval    = "Oval"
    round   = "Round"
    square  = "Square"
    heart   = "Heart"
    diamond = "Diamond"
    oblong  = "Oblong"


# ── Skin Analysis ─────────────────────────────────────────────────────────────
class SkinTone(BaseModel):
    hex:         str = Field(..., description="Hex color code e.g. '#C8956C'")
    name:        str = Field(..., description="Human-readable tone name")
    undertone:   str = Field(..., description="Warm / Cool / Neutral")
    fitzpatrick: str = Field(..., description="I / II / III / IV / V / VI")


class SkinConcern(BaseModel):
    name:     str = Field(..., description="Concern name e.g. 'Acne'")
    icon:     str = Field("⚠️", description="Emoji icon")
    severity: str = Field(..., description="Mild / Moderate / High")


class ColorEntry(BaseModel):
    hex:  str
    name: str
    why:  Optional[str] = None


class ColorAvoid(BaseModel):
    hex:    str
    name:   str
    reason: Optional[str] = None


class ColorPalette(BaseModel):
    recommended: List[ColorEntry]
    avoid:       List[ColorAvoid]


class OutfitRecommendation(BaseModel):
    icon:        str
    name:        str
    type:        str
    occasion:    str
    why:         str
    recommended: bool = False
    image_url:   Optional[str] = None


class SkinAnalysisResponse(BaseModel):
    skin_tone:     SkinTone
    concerns:      List[SkinConcern]
    color_palette: ColorPalette
    outfits:       List[OutfitRecommendation]
    task_id:       Optional[str] = None


# ── Try-On ────────────────────────────────────────────────────────────────────
class TryOnResponse(BaseModel):
    result_url: str
    task_id:    Optional[str] = None


# ── Glasses ──────────────────────────────────────────────────────────────────
class GlassesFrame(BaseModel):
    icon:      str
    name:      str
    style:     str
    score:     int = Field(..., ge=1, le=5)
    why:       str
    image_url: Optional[str] = None


class CareTip(BaseModel):
    icon:  str
    title: str
    desc:  str


class GlassesAnalysisResponse(BaseModel):
    face_shape:         Dict[str, str]
    frame_colors:       List[Dict[str, str]]
    recommended_frames: List[GlassesFrame]
    care_tips:          List[CareTip]


# ── Remedies ─────────────────────────────────────────────────────────────────
class Ingredient(BaseModel):
    icon:   str
    name:   str
    amount: str


class Remedy(BaseModel):
    name:        str
    ingredients: List[Ingredient]
    steps:       List[str]
    time:        str
    frequency:   str
    results:     str


class ConcernRemedies(BaseModel):
    remedies:        List[Remedy]
    clothing_advice: Optional[str] = None


class RemediesRequest(BaseModel):
    concerns: List[str]


# ── History ───────────────────────────────────────────────────────────────────
class HistoryEntry(BaseModel):
    session_id: Optional[str] = None
    user_id:    str
    occasion:   Optional[str] = None
    styles:     Optional[List[str]] = None
    result:     Optional[Any] = None
    created_at: str


class SaveHistoryResponse(BaseModel):
    session_id: str
    success:    bool = True

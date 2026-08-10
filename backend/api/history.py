"""
ToneWear AI — History API Router
POST /api/history/save           — Save analysis session
GET  /api/history/{user_id}      — Get all sessions for user
GET  /api/history/{user_id}/{session_id}  — Get specific session
DELETE /api/history/{user_id}/{session_id} — Delete session
"""

from fastapi import APIRouter, HTTPException
from schemas import HistoryEntry, SaveHistoryResponse
from services.storage import storage_service

router = APIRouter()


# ── Save Session ──────────────────────────────────────────────────────────────
@router.post("/save", response_model=SaveHistoryResponse)
async def save_history(entry: HistoryEntry):
    """Save an analysis session to local JSON storage."""
    if not entry.user_id:
        raise HTTPException(400, "user_id is required")

    try:
        session_id = storage_service.save_session(
            user_id=entry.user_id,
            data=entry.dict(exclude_none=True)
        )
        return SaveHistoryResponse(session_id=session_id, success=True)
    except Exception as e:
        raise HTTPException(500, f"Failed to save: {str(e)}")


# ── Get All History ───────────────────────────────────────────────────────────
@router.get("/{user_id}")
async def get_history(user_id: str):
    """Get all analysis sessions for a user."""
    try:
        history = storage_service.get_history(user_id)
        return {"user_id": user_id, "sessions": history, "count": len(history)}
    except Exception as e:
        raise HTTPException(500, f"Failed to load history: {str(e)}")


# ── Get Specific Session ──────────────────────────────────────────────────────
@router.get("/{user_id}/{session_id}")
async def get_session(user_id: str, session_id: str):
    """Get a specific analysis session."""
    session = storage_service.get_session(user_id, session_id)
    if not session:
        raise HTTPException(404, f"Session {session_id} not found")
    return session


# ── Delete Session ────────────────────────────────────────────────────────────
@router.delete("/{user_id}/{session_id}")
async def delete_session(user_id: str, session_id: str):
    """Delete a specific analysis session."""
    deleted = storage_service.delete_session(user_id, session_id)
    if not deleted:
        raise HTTPException(404, f"Session {session_id} not found")
    return {"success": True, "session_id": session_id}

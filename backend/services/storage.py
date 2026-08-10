"""
ToneWear AI — Storage Service
Local JSON storage for user history (no database required)
"""

import json
import uuid
import os
from datetime import datetime
from typing import Any, Optional

STORAGE_DIR = os.path.join(os.path.dirname(__file__), "..", "storage")


class StorageService:
    """
    File-based JSON storage.
    One file per user: storage/{user_id}.json
    """

    def __init__(self):
        os.makedirs(STORAGE_DIR, exist_ok=True)

    def _get_path(self, user_id: str) -> str:
        # Sanitize user_id for filesystem safety
        safe_id = user_id.replace("/", "_").replace("..", "_")
        return os.path.join(STORAGE_DIR, f"{safe_id}.json")

    def _load_user(self, user_id: str) -> list:
        path = self._get_path(user_id)
        if not os.path.exists(path):
            return []
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save_user(self, user_id: str, entries: list) -> None:
        path = self._get_path(user_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(entries, f, ensure_ascii=False, indent=2)

    def save_session(self, user_id: str, data: dict) -> str:
        """Save an analysis session. Returns session_id."""
        session_id = str(uuid.uuid4())[:8]

        entry = {
            "session_id": session_id,
            "user_id":    user_id,
            "created_at": data.get("created_at", datetime.utcnow().isoformat()),
            **{k: v for k, v in data.items() if k not in ("user_id", "session_id")}
        }

        history = self._load_user(user_id)
        # Prepend (newest first)
        history.insert(0, entry)
        # Keep last 50 sessions
        history = history[:50]
        self._save_user(user_id, history)

        return session_id

    def get_history(self, user_id: str) -> list:
        """Return all sessions for user, newest first."""
        return self._load_user(user_id)

    def get_session(self, user_id: str, session_id: str) -> Optional[dict]:
        """Get a specific session."""
        history = self._load_user(user_id)
        for entry in history:
            if entry.get("session_id") == session_id:
                return entry
        return None

    def delete_session(self, user_id: str, session_id: str) -> bool:
        """Delete a specific session. Returns True if found and deleted."""
        history = self._load_user(user_id)
        original_len = len(history)
        history = [e for e in history if e.get("session_id") != session_id]

        if len(history) < original_len:
            self._save_user(user_id, history)
            return True
        return False

    def clear_all(self, user_id: str) -> None:
        """Delete all sessions for user."""
        path = self._get_path(user_id)
        if os.path.exists(path):
            os.remove(path)


# ── Singleton ─────────────────────────────────────────────────────────────────
storage_service = StorageService()

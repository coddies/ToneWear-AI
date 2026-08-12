"""
ToneWear AI — YouCam API Service
YouCam Perfect AI: Skin Analysis + Virtual Try-On + Glasses Try-On

Auth: JWT signed with RSA private key, using client_id + public_key from portal
API Docs: https://yce.makeupar.com/api-console
"""

import asyncio
import os
import time
import json
import base64
from typing import Optional, Dict, Any
import httpx
from dotenv import load_dotenv

load_dotenv()

YOUCAM_CLIENT_ID  = os.getenv("YOUCAM_CLIENT_ID", "")
YOUCAM_PUBLIC_KEY = os.getenv("YOUCAM_PUBLIC_KEY", "")

# YouCam API base URL (from their developer console)
YOUCAM_BASE_URL = "https://yce.makeupar.com"

POLL_INTERVAL = 2    # seconds between polls
MAX_POLLS     = 30   # 60 seconds max wait


class YouCamService:
    """
    YouCam Perfect AI Integration
    Handles: Skin Analysis, Virtual Try-On, Glasses Try-On
    """

    def __init__(self):
        self.client_id  = YOUCAM_CLIENT_ID
        self.public_key = YOUCAM_PUBLIC_KEY
        self.base_url   = YOUCAM_BASE_URL
        self._token     = None
        self._token_exp = 0

    def is_configured(self) -> bool:
        return bool(self.client_id and self.public_key)

    # ── Auth Token ────────────────────────────────────────────────────────────
    def _get_auth_headers(self) -> dict:
        """Build auth headers using client_id as Bearer token."""
        return {
            "Authorization": f"Bearer {self.client_id}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    # ── File Upload ───────────────────────────────────────────────────────────
    async def upload_file(self, image_bytes: bytes, filename: str = "image.jpg") -> str:
        """Upload image to YouCam → returns file_id / resource_id"""
        if not self.is_configured():
            raise ValueError("YouCam API not configured. Set YOUCAM_CLIENT_ID in .env")

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{self.base_url}/api/v1/resource/upload",
                headers={
                    "Authorization": f"Bearer {self.client_id}",
                    "Accept": "application/json"
                },
                files={"file": (filename, image_bytes, "image/jpeg")}
            )
            response.raise_for_status()
            data = response.json()
            # Try different field names YouCam might use
            return data.get("resource_id") or data.get("file_id") or data.get("id") or ""

    # ── Skin Analysis ─────────────────────────────────────────────────────────
    async def analyze_skin(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Analyze skin tone, undertone, fitzpatrick scale, concerns.
        Returns structured skin profile dict.
        """
        if not self.is_configured():
            raise ValueError("YouCam API not configured")

        resource_id = await self.upload_file(image_bytes, "selfie.jpg")

        async with httpx.AsyncClient(timeout=30) as client:
            task_response = await client.post(
                f"{self.base_url}/api/v1/task/skin-analysis",
                headers=self._get_auth_headers(),
                json={"resource_id": resource_id}
            )
            task_response.raise_for_status()
            task_data = task_response.json()
            task_id   = task_data.get("task_id") or task_data.get("id") or ""

        return await self._poll_task(task_id)

    # ── Virtual Try-On ────────────────────────────────────────────────────────
    async def virtual_tryon(
        self,
        person_image_bytes: bytes,
        clothing_image_bytes: Optional[bytes] = None,
        clothing_image_url: Optional[str]   = None,
        clothing_resource_id: Optional[str] = None
    ) -> str:
        """
        Generate virtual try-on.
        Returns result image URL.
        """
        if not self.is_configured():
            raise ValueError("YouCam API not configured")

        person_resource_id = await self.upload_file(person_image_bytes, "person.jpg")

        # Build payload
        if clothing_resource_id:
            payload = {
                "person_resource_id":   person_resource_id,
                "clothing_resource_id": clothing_resource_id
            }
        elif clothing_image_bytes:
            cloth_id = await self.upload_file(clothing_image_bytes, "clothing.jpg")
            payload = {
                "person_resource_id":   person_resource_id,
                "clothing_resource_id": cloth_id
            }
        elif clothing_image_url:
            payload = {
                "person_resource_id": person_resource_id,
                "clothing_url":       clothing_image_url
            }
        else:
            raise ValueError("clothing_image_bytes or clothing_image_url required")

        async with httpx.AsyncClient(timeout=30) as client:
            task_response = await client.post(
                f"{self.base_url}/api/v1/task/virtual-tryon",
                headers=self._get_auth_headers(),
                json=payload
            )
            task_response.raise_for_status()
            task_id = task_response.json().get("task_id") or task_response.json().get("id") or ""

        result = await self._poll_task(task_id)
        return result.get("result_url") or result.get("image_url") or ""

    # ── Glasses Try-On ────────────────────────────────────────────────────────
    async def glasses_tryon(
        self,
        face_image_bytes: bytes,
        frame_image_url: str
    ) -> Dict[str, Any]:
        """Glasses virtual try-on + face shape detection."""
        if not self.is_configured():
            raise ValueError("YouCam API not configured")

        face_resource_id = await self.upload_file(face_image_bytes, "face.jpg")

        async with httpx.AsyncClient(timeout=30) as client:
            task_response = await client.post(
                f"{self.base_url}/api/v1/task/glasses-tryon",
                headers=self._get_auth_headers(),
                json={
                    "face_resource_id": face_resource_id,
                    "frame_img_url":    frame_image_url
                }
            )
            task_response.raise_for_status()
            task_id = task_response.json().get("task_id") or task_response.json().get("id") or ""

        return await self._poll_task(task_id)

    # ── Poll Task Status ──────────────────────────────────────────────────────
    async def _poll_task(self, task_id: str) -> Dict[str, Any]:
        """Poll YouCam task until done (completed | failed)."""
        async with httpx.AsyncClient(timeout=15) as client:
            for attempt in range(MAX_POLLS):
                response = await client.get(
                    f"{self.base_url}/api/v1/task/{task_id}",
                    headers=self._get_auth_headers()
                )
                response.raise_for_status()
                data   = response.json()
                status = data.get("status", "pending")

                if status == "completed":
                    return data.get("result", data)
                if status == "failed":
                    raise RuntimeError(f"YouCam task failed: {data.get('error', 'Unknown')}")

                await asyncio.sleep(POLL_INTERVAL)

        raise TimeoutError(f"YouCam task {task_id} timed out")


# ── Singleton ─────────────────────────────────────────────────────────────────
youcam_service = YouCamService()

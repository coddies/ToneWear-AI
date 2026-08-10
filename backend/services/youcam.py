"""
ToneWear AI — YouCam API Service
Handles all YouCam Perfect AI API calls (skin analysis + virtual try-on)

YouCam API Flow:
1. Upload file → get file_id
2. Create task with file_id + task type
3. Poll task status until completed
4. Return result URL
"""

import asyncio
import os
from typing import Optional, Dict, Any
import httpx
from dotenv import load_dotenv

load_dotenv()

YOUCAM_API_KEY = os.getenv("YOUCAM_API_KEY", "")
YOUCAM_BASE_URL = "https://api.youcam.ai/v1"   # Update to actual endpoint when registered
POLL_INTERVAL = 2    # seconds between polls
MAX_POLLS     = 30   # 60 seconds max wait


class YouCamService:
    """
    YouCam Perfect API Integration
    Docs: https://developers.youcam.ai (register for API key)
    """

    def __init__(self):
        self.api_key  = YOUCAM_API_KEY
        self.base_url = YOUCAM_BASE_URL
        self.headers  = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json"
        }

    # ── File Upload ───────────────────────────────────────────────────────────
    async def upload_file(self, image_bytes: bytes, filename: str = "image.jpg") -> str:
        """
        Upload image to YouCam CDN → returns file_id
        """
        if not self.api_key:
            raise ValueError("YOUCAM_API_KEY not set in environment")

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{self.base_url}/files/upload",
                headers=self.headers,
                files={"file": (filename, image_bytes, "image/jpeg")}
            )
            response.raise_for_status()
            data = response.json()
            return data["file_id"]

    # ── Skin Analysis ─────────────────────────────────────────────────────────
    async def analyze_skin(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Analyze skin: tone, undertone, fitzpatrick, concerns
        Returns YouCam skin analysis result dict
        """
        file_id = await self.upload_file(image_bytes, "selfie.jpg")

        async with httpx.AsyncClient(timeout=30) as client:
            # Create analysis task
            task_response = await client.post(
                f"{self.base_url}/tasks/skin-analysis",
                headers={**self.headers, "Content-Type": "application/json"},
                json={"file_id": file_id}
            )
            task_response.raise_for_status()
            task_data = task_response.json()
            task_id   = task_data["task_id"]

        # Poll for completion
        return await self._poll_task(task_id)

    # ── Virtual Try-On ────────────────────────────────────────────────────────
    async def virtual_tryon(
        self,
        person_image_bytes: bytes,
        clothing_image_bytes: Optional[bytes] = None,
        clothing_image_url: Optional[str]   = None
    ) -> str:
        """
        Generate virtual try-on.
        Returns result image URL.
        """
        person_file_id = await self.upload_file(person_image_bytes, "person.jpg")

        # Get clothing file_id
        if clothing_image_bytes:
            clothing_file_id = await self.upload_file(clothing_image_bytes, "clothing.jpg")
            payload = {
                "person_file_id":   person_file_id,
                "clothing_file_id": clothing_file_id
            }
        elif clothing_image_url:
            payload = {
                "person_file_id": person_file_id,
                "clothing_url":   clothing_image_url
            }
        else:
            raise ValueError("Either clothing_image_bytes or clothing_image_url required")

        async with httpx.AsyncClient(timeout=30) as client:
            task_response = await client.post(
                f"{self.base_url}/tasks/virtual-tryon",
                headers={**self.headers, "Content-Type": "application/json"},
                json=payload
            )
            task_response.raise_for_status()
            task_id = task_response.json()["task_id"]

        result = await self._poll_task(task_id)
        return result.get("result_url", "")

    # ── Glasses Try-On ────────────────────────────────────────────────────────
    async def glasses_tryon(
        self,
        face_image_bytes: bytes,
        frame_image_url: str
    ) -> Dict[str, Any]:
        """
        Analyze face shape + apply glasses virtually.
        Returns: {face_shape, result_url}
        """
        face_file_id = await self.upload_file(face_image_bytes, "face.jpg")

        async with httpx.AsyncClient(timeout=30) as client:
            task_response = await client.post(
                f"{self.base_url}/tasks/glasses-tryon",
                headers={**self.headers, "Content-Type": "application/json"},
                json={
                    "face_file_id":  face_file_id,
                    "frame_img_url": frame_image_url
                }
            )
            task_response.raise_for_status()
            task_id = task_response.json()["task_id"]

        return await self._poll_task(task_id)

    # ── Face Shape Analysis ───────────────────────────────────────────────────
    async def analyze_face_shape(self, face_image_bytes: bytes) -> str:
        """
        Detect face shape from image.
        Returns: 'Oval' | 'Round' | 'Square' | 'Heart' | 'Diamond' | 'Oblong'
        """
        result = await self.glasses_tryon(face_image_bytes, frame_image_url="")
        return result.get("face_shape", "Oval")

    # ── Poll Task Status ──────────────────────────────────────────────────────
    async def _poll_task(self, task_id: str) -> Dict[str, Any]:
        """
        Poll YouCam task status until completed.
        Status values: pending → processing → completed | failed
        """
        async with httpx.AsyncClient(timeout=15) as client:
            for attempt in range(MAX_POLLS):
                response = await client.get(
                    f"{self.base_url}/tasks/{task_id}",
                    headers=self.headers
                )
                response.raise_for_status()
                data   = response.json()
                status = data.get("status", "pending")

                if status == "completed":
                    return data.get("result", data)

                if status == "failed":
                    raise RuntimeError(f"YouCam task failed: {data.get('error', 'Unknown error')}")

                await asyncio.sleep(POLL_INTERVAL)

        raise TimeoutError(f"YouCam task {task_id} timed out after {MAX_POLLS * POLL_INTERVAL}s")


# ── Singleton ─────────────────────────────────────────────────────────────────
youcam_service = YouCamService()

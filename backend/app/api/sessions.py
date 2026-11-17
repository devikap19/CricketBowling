"""Session creation and streamed video upload endpoint."""

import json
import uuid
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter()
CHUNK_SIZE = 1024 * 1024
ALLOWED_EXTENSIONS = {".mp4", ".mov"}


class SessionResponse(BaseModel):
    session_id: str
    bowler_name: str
    session_date: date
    bowling_type: Literal["fast", "medium", "spin"]
    bowling_arm: Literal["right", "left"]
    camera_view: Literal["front", "side", "rear", "other"]
    notes: str | None = None
    original_filename: str
    video_size_bytes: int
    status: Literal["uploaded"]
    created_at: datetime


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions() -> list[SessionResponse]:
    """Return saved session metadata without exposing storage locations."""
    sessions_dir = Path(settings.sessions_dir).resolve()
    if not sessions_dir.exists():
        return []
    sessions: list[SessionResponse] = []
    for metadata_path in sessions_dir.glob("*.json"):
        if metadata_path.name.endswith((".quality.json", ".pose.json", ".tracking.json")):
            continue
        try:
            if metadata_path.resolve().parent != sessions_dir:
                continue
            session = SessionResponse.model_validate_json(metadata_path.read_text(encoding="utf-8"))
            if metadata_path.name == f"{session.session_id}.json":
                sessions.append(session)
        except (OSError, UnicodeError, ValueError):
            # One malformed record should not prevent coaches from seeing other sessions.
            continue
    return sorted(sessions, key=lambda item: item.created_at, reverse=True)


def _is_supported_video(header: bytes) -> bool:
    """Check common MP4/MOV ISO base media file signatures without decoding."""
    return len(header) >= 12 and header[4:8] == b"ftyp"


@router.post("/sessions", response_model=SessionResponse, status_code=201)
async def create_session(
    video: UploadFile = File(...),
    bowler_name: str = Form(..., min_length=1, max_length=120),
    session_date: date = Form(...),
    bowling_type: Literal["fast", "medium", "spin"] = Form(...),
    bowling_arm: Literal["right", "left"] = Form(...),
    camera_view: Literal["front", "side", "rear", "other"] = Form(...),
    notes: str | None = Form(default=None, max_length=2000),
) -> SessionResponse:
    name = bowler_name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Bowler name is required.")

    original_filename = Path((video.filename or "").replace("\\", "/")).name
    extension = Path(original_filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Unsupported video type. Upload an MP4 or MOV file.")

    session_id = str(uuid.uuid4())
    upload_dir = Path(settings.upload_dir)
    sessions_dir = Path(settings.sessions_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    sessions_dir.mkdir(parents=True, exist_ok=True)
    video_path = upload_dir / f"{session_id}{extension}"
    temporary_video_path = upload_dir / f".{session_id}.part"
    metadata_path = sessions_dir / f"{session_id}.json"
    temporary_metadata_path = sessions_dir / f".{session_id}.json.part"

    total_size = 0
    try:
        with temporary_video_path.open("wb") as destination:
            first_chunk = await video.read(CHUNK_SIZE)
            if not _is_supported_video(first_chunk):
                raise HTTPException(status_code=415, detail="The file content is not a supported MP4 or MOV video.")
            while first_chunk:
                total_size += len(first_chunk)
                if total_size > settings.max_upload_size_bytes:
                    raise HTTPException(status_code=413, detail=f"Video exceeds the {settings.max_upload_size_bytes // (1024 * 1024)} MB upload limit.")
                destination.write(first_chunk)
                first_chunk = await video.read(CHUNK_SIZE)

        if total_size == 0:
            raise HTTPException(status_code=415, detail="The uploaded video is empty.")

        video_path = upload_dir / f"{session_id}{extension}"
        temporary_video_path.replace(video_path)
        response = SessionResponse(
            session_id=session_id,
            bowler_name=name,
            session_date=session_date,
            bowling_type=bowling_type,
            bowling_arm=bowling_arm,
            camera_view=camera_view,
            notes=notes.strip() if notes and notes.strip() else None,
            original_filename=original_filename,
            video_size_bytes=total_size,
            status="uploaded",
            created_at=datetime.now(timezone.utc),
        )
        temporary_metadata_path.write_text(response.model_dump_json(indent=2), encoding="utf-8")
        temporary_metadata_path.replace(metadata_path)
        return response
    except Exception:
        temporary_video_path.unlink(missing_ok=True)
        temporary_metadata_path.unlink(missing_ok=True)
        if video_path.exists() and not metadata_path.exists():
            video_path.unlink(missing_ok=True)
        raise
    finally:
        await video.close()

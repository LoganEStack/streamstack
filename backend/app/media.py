from app.config import RENDITION_LADDER, UPLOADS_ROOT
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from pathlib import Path
from sqlmodel import Session, select
from app.database import get_session
from app.models import Video

router = APIRouter(prefix="/media", tags=["media"])

VALID_RENDITIONS = {rung["name"] for rung in RENDITION_LADDER}

MIME_TYPES = {
    ".m3u8": "application/vnd.apple.mpegurl",
    ".ts": "video/mp2t",
}


def get_cache_headers(filename: str) -> dict:
    '''Returns the cache headers for the given filename. Manifest files should not be cached.'''

    if filename.endswith(".m3u8"):
        return {"Cache-Control": "no-cache"}
    if filename.endswith(".ts"):
        return {"Cache-Control": "public, max-age=31536000, immutable"}
    return {}


def resolve_media_slug(public_id: str, session: Session) -> str:
    '''Resolves the media slug for the given public ID.'''

    video = session.exec(
        select(Video).where(Video.public_id == public_id)
    ).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video.media_slug


def resolve_safe_path(media_slug: str, relative_path: str) -> Path:
    '''Resolves the safe path for the given media slug and relative path.'''

    file_path = UPLOADS_ROOT / media_slug / relative_path
    try:
        file_path.resolve().relative_to(UPLOADS_ROOT.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Invalid path")
    return file_path


@router.get("/{public_id}/master.m3u8")
def get_master_manifest(public_id: str, session: Session = Depends(get_session)):
    '''Returns the master manifest for the given public ID.'''

    media_slug = resolve_media_slug(public_id, session)
    file_path = resolve_safe_path(media_slug, "master.m3u8")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Master manifest not found")
    return FileResponse(
        file_path,
        media_type="application/vnd.apple.mpegurl",
        headers={"Cache-Control": "no-cache"},
    )


@router.get("/{public_id}/{rendition}/{filename}")
def get_media_file(
    public_id: str, rendition: str, filename: str, session: Session = Depends(get_session)
):
    '''Returns the media file for the given public ID, rendition (e.g. "1080p"), and filename.'''

    if rendition not in VALID_RENDITIONS:
        raise HTTPException(status_code=404, detail="Unknown rendition")

    media_slug = resolve_media_slug(public_id, session)
    file_path = resolve_safe_path(media_slug, f"{rendition}/{filename}")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    ext = file_path.suffix
    media_type = MIME_TYPES.get(ext, "application/octet-stream")
    headers = get_cache_headers(filename)

    return FileResponse(file_path, media_type=media_type, headers=headers)
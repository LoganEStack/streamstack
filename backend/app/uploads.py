import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
from fastapi.responses import FileResponse
from pathlib import Path
from datetime import datetime, timezone
from sqlmodel import Session, select
from app.database import get_session, engine
from app.config import UPLOADS_DIR, MAX_UPLOAD_SIZE_BYTES, ALLOWED_UPLOAD_EXTENSIONS, JOB_TTL_MINUTES
from app.models import UploadJob, UploadJobPublic, JobStatus, generate_unique_upload_token
from app.transcode import run_transcode_job

router = APIRouter(tags=["upload"])

MIME_TYPES = {".m3u8": "application/vnd.apple.mpegurl", ".ts": "video/mp2t"}


def _is_expired(job: UploadJob) -> bool:
    expires_at = job.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) > expires_at


def _delete_job_files(upload_token: str):
    job_dir = UPLOADS_DIR / upload_token
    if job_dir.exists():
        shutil.rmtree(job_dir, ignore_errors=True)


def _resolve_ready_job(upload_token: str, session: Session) -> UploadJob:
    job = session.exec(select(UploadJob).where(UploadJob.upload_token == upload_token)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if _is_expired(job):
        _delete_job_files(upload_token)
        session.delete(job)
        session.commit()
        raise HTTPException(status_code=410, detail="This upload has expired")
    if job.status != JobStatus.ready:
        raise HTTPException(status_code=409, detail=f"Job is not ready (status: {job.status})")
    return job


def _safe_upload_path(upload_token: str, relative_path: str) -> Path:
    file_path = UPLOADS_DIR / upload_token / relative_path
    try:
        file_path.resolve().relative_to(UPLOADS_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Invalid path")
    return file_path


@router.post("/upload", response_model=UploadJobPublic)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    upload_token = generate_unique_upload_token(session)
    job_dir = UPLOADS_DIR / upload_token
    job_dir.mkdir(parents=True, exist_ok=True)
    source_path = job_dir / f"source{ext}"

    # Stream to disk in chunks, rejecting early if it exceeds the size cap —
    # avoids buffering an arbitrarily large upload fully into memory first.
    size = 0
    with open(source_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):  # 1MB at a time
            size += len(chunk)
            if size > MAX_UPLOAD_SIZE_BYTES:
                f.close()
                shutil.rmtree(job_dir, ignore_errors=True)
                raise HTTPException(status_code=413, detail="File too large")
            f.write(chunk)

    job = UploadJob(upload_token=upload_token)
    session.add(job)
    session.commit()
    session.refresh(job)

    def _run_job():
        with Session(engine) as bg_session:
            run_transcode_job(upload_token, source_path, job_dir, bg_session)

    background_tasks.add_task(_run_job)

    return job


@router.get("/jobs/{upload_token}", response_model=UploadJobPublic)
def get_job_status(upload_token: str, session: Session = Depends(get_session)):
    job = session.exec(select(UploadJob).where(UploadJob.upload_token == upload_token)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if _is_expired(job):
        _delete_job_files(upload_token)
        session.delete(job)
        session.commit()
        raise HTTPException(status_code=410, detail="This upload has expired")

    return job


@router.get("/uploads/{upload_token}/master.m3u8")
def get_upload_master(upload_token: str, session: Session = Depends(get_session)):
    _resolve_ready_job(upload_token, session)
    file_path = _safe_upload_path(upload_token, "master.m3u8")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Manifest not found")
    return FileResponse(file_path, media_type="application/vnd.apple.mpegurl", headers={"Cache-Control": "no-cache"})


@router.get("/uploads/{upload_token}/{rendition}/{filename}")
def get_upload_file(upload_token: str, rendition: str, filename: str, session: Session = Depends(get_session)):
    _resolve_ready_job(upload_token, session)
    file_path = _safe_upload_path(upload_token, f"{rendition}/{filename}")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    ext = file_path.suffix
    media_type = MIME_TYPES.get(ext, "application/octet-stream")
    cache = {"Cache-Control": "public, max-age=31536000, immutable"} if ext == ".ts" else {}
    return FileResponse(file_path, media_type=media_type, headers=cache)
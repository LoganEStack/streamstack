import secrets
from app.config import JOB_TTL_MINUTES
from enum import Enum
from typing import Optional
from sqlmodel import SQLModel, Field, Session, select
from datetime import datetime, timedelta, timezone


class JobStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    ready = "ready"
    failed = "failed"


class UploadJob(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    upload_token: str = Field(unique=True, index=True)
    status: JobStatus = Field(default=JobStatus.pending)
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc) + timedelta(minutes=JOB_TTL_MINUTES)
    )


class UploadJobPublic(SQLModel):
    upload_token: str
    status: JobStatus
    error_message: Optional[str] = None


def generate_unique_upload_token(session: Session) -> str:
    '''Generates a unique upload token.'''
    
    while True:
        candidate = secrets.token_urlsafe(16)
        exists = session.exec(
            select(UploadJob).where(UploadJob.upload_token == candidate)
        ).first()
        if not exists:
            return candidate
from sqlmodel import SQLModel, Field, Session, select
from typing import Optional
import secrets


class Video(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    public_id: str = Field(unique=True, index=True)
    media_slug: str
    title: str
    description: str
    thumbnail_url: str


class VideoPublic(SQLModel):
    public_id: str
    title: str
    description: str
    thumbnail_url: str


def generate_unique_public_id(session: Session) -> str:
    while True:
        candidate = secrets.token_urlsafe(8)
        exists = session.exec(
            select(Video).where(Video.public_id == candidate)
        ).first()
        if not exists:
            return candidate
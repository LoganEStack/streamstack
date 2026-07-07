from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.models import Video, VideoPublic

router = APIRouter(prefix="/v", tags=["video"])


@router.get("/{video_public_id}", response_model=VideoPublic)
def get_video(video_public_id: str, session: Session = Depends(get_session)):
    video = session.exec(
        select(Video).where(Video.public_id == video_public_id)
    ).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video
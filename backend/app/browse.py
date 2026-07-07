from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.database import get_session
from app.models import Video, VideoPublic

router = APIRouter(prefix="/browse", tags=["browse"])


@router.get("", response_model=list[VideoPublic])
def list_videos(session: Session = Depends(get_session)):
    return session.exec(select(Video)).all()
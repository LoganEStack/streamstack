from app.database import get_session
from app.models import Video, VideoPublic
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

router = APIRouter(prefix="/browse", tags=["browse"])


@router.get("", response_model=list[VideoPublic])
def list_videos(session: Session = Depends(get_session)):
    '''Returns a list of all sample videos.'''

    return session.exec(select(Video)).all()
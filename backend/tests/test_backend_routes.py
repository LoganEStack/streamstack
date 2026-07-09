from sqlmodel import Session, select

from app import database
from app.models import Video


def test_root_endpoint_returns_status(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_browse_lists_seeded_videos(client):
    response = client.get("/browse")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["title"] == "Sample video"


def test_video_detail_returns_existing_video(client):
    with Session(database.engine) as session:
        video = session.exec(select(Video)).first()
        assert video is not None
        public_id = video.public_id

    response = client.get(f"/v/{public_id}")

    assert response.status_code == 200
    assert response.json()["title"] == "Sample video"


def test_video_detail_returns_404_for_missing_video(client):
    response = client.get("/v/does-not-exist")

    assert response.status_code == 404
    assert response.json() == {"detail": "Video not found"}

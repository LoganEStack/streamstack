import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine

from app import database
from app.main import app as fastapi_app
from app.models import Video, generate_unique_public_id


@pytest.fixture()
def client(monkeypatch):
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    monkeypatch.setattr(database, "engine", engine)

    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        video = Video(
            public_id=generate_unique_public_id(session),
            media_slug="sample-video",
            title="Sample video",
            description="A sample video for testing.",
            thumbnail_url="/uploads/sample-video/thumbnail.jpg",
        )
        session.add(video)
        session.commit()

    with TestClient(fastapi_app) as test_client:
        yield test_client

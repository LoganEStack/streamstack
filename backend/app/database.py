from app.config import BACKEND_DIR
from sqlmodel import SQLModel, create_engine, Session


DATABASE_URL = f"sqlite:///{BACKEND_DIR / 'streamstack.db'}"

engine = create_engine(DATABASE_URL, echo=True, connect_args={"check_same_thread": False})


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
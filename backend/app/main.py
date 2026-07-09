from app.config import BASE_DIR
from app.database import create_db_and_tables
from app.media import router as media_router
from app.browse import router as browse_router
from app.video_detail import router as video_detail_router
from app.uploads import router as upload_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Streaming Backend")
app.mount("/uploads", StaticFiles(directory=BASE_DIR / "uploads"), name="uploads")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

app.include_router(media_router)            # /media/...
app.include_router(browse_router)           # /browse
app.include_router(video_detail_router)     # /v/{video_public_id}
app.include_router(upload_router)           # /uploads/...

@app.get("/")
def root():
    return {"status": "ok"}
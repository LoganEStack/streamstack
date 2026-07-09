from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent.parent
BASE_DIR = BACKEND_DIR.parent

DATABASE_URL = f"sqlite:///{BACKEND_DIR / 'streamstack.db'}"

UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

MAX_UPLOAD_SIZE_BYTES = 200 * 1024 * 1024  # 200 MB
ALLOWED_UPLOAD_EXTENSIONS = {".mp4", ".mov", ".mkv"}
JOB_TTL_MINUTES = 30

RENDITION_LADDER = [
    {"name": "1080p", "width": 1920, "height": 1080, "bitrate": "5000k"},
    {"name": "720p", "width": 1280, "height": 720, "bitrate": "2800k"},
    {"name": "480p", "width": 854, "height": 480, "bitrate": "1400k"},
    {"name": "360p", "width": 640, "height": 360, "bitrate": "800k"},
]
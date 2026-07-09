# Stream Stack

A small streaming app that serves videos using FFmpeg and the HLS protocol.


## What it does

- Watch any catalog video with a real adaptive-bitrate player (HLS.js),
  including a live rendition meter showing which quality is currently
  playing, manual quality override, and a segment-level "stream inspector"
  panel that shows exactly which `.ts` file is playing, how long is left in
  it, and the raw master manifest on request.
- Upload your own video file. It runs through the same FFmpeg pipeline 
  used to build the catalog, transcodes in the background, and is served back 
  with a 4 stage rendition ladder.


## Why it's built this way

A few design decisions and trade-offs will be discussed below. 

**No user accounts / auth system.**
I'd originally intended to include an auth system and watchlist functionality
with this application. After messing around for a bit, I decided that these 
features were not directly related to what the project itself was trying to demonstrate. 
They show an understanding of general web development practices, rather than that of video 
streaming technologies. Any fleshed out application would feature a user sign-in system 
with JWT authentification, authorization, password hashing, and the like.

**Token-based access instead of accounts.**
Every catalog video has a `public_id` - a random opaque identifier
(`secrets.token_urlsafe(8)`). Other options are simpler but come with problems. 
A sequential ID leaks how many videos exist and lets anyone
enumerate the whole catalog by incrementing a counter. A title hash is
guessable and collides across similarly-named videos.

Uploads use the same pattern with a longer token
(`secrets.token_urlsafe(16)`) called an `upload_token`.

**FastAPI `BackgroundTasks` vs. a task queue.**
Transcoding takes real time and can't block the HTTP request/response
cycle, so it has to run asynchronously. A production system would use a 
real task queue (Celery, RQ) backed by Redis, so jobs survive a server 
restart and can scale across workers. Delegating this task to `BackgroundTasks` 
is enough to demonstrate that transcoding can't be synchronous without the additional overhead.

**A cron job for DB cleanup.**
The deployment of this application uses a cron job to clean up any uploaded files after the TTL expires. The TTL is only 30 minutes because this is just a demonstration project. A scalable application would have a separate service that more intelligently deletes data after storing it for much longer.


## Architecture

```
┌────────────────┐        ┌─────────────────────┐        ┌────────────────────┐
│    Browser     │──────▶│  FastAPI (8000)      │──────▶│       SQLite       │
│ React + HLS.js │        │  browse/video/media │        │  video, upload_job │
└────────────────┘        │  upload/jobs        │        └────────────────────┘
                          └────────┬────────────┘
                                   │ BackgroundTasks
                                   ▼
                          ┌───────────────────────┐
                          │   FFmpeg (subprocess) │
                          │  -var_stream_map      │
                          └────────┬──────────────┘
                                   │
                                   ▼
                          ┌───────────────────────────┐
                          │    HLS output on disk     │
                          │  master.m3u8 + renditions │
                          └───────────────────────────┘
```


## API reference

Interactive docs are available at `/docs` (FastAPI's auto-generated Swagger UI)
whenever the backend is running.

| Method | Path | Description |
|---|---|---|
| `GET`  | `/browse` | List catalog videos (public fields only) |
| `GET`  | `/v/{public_id}` | Single catalog video's metadata |
| `GET`  | `/media/{public_id}/master.m3u8` | Master manifest for a catalog video |
| `GET`  | `/media/{public_id}/{rendition}/{file}` | Rendition manifest or segment |
| `POST` | `/upload` | Upload a file (`multipart/form-data`), returns a job |
| `GET`  | `/jobs/{upload_token}` | Poll job status: `pending → processing → ready \| failed` |
| `GET`  | `/uploads/{upload_token}/master.m3u8` | Master manifest for a user upload |
| `GET`  | `/uploads/{upload_token}/{rendition}/{file}` | Rendition manifest or segment for a user upload |


## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- [FFmpeg](https://ffmpeg.org/download.html) available on your `PATH` (verify with `ffmpeg -version`)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
python seed.py                 # populates the catalog with sample videos
uvicorn app.main:app --reload
```

Runs on `http://localhost:8000`. Visit `/docs` to explore the API directly.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173` (Vite's default).


## Design notes worth calling out

- **Path traversal protection**: every file-serving route resolves the
  requested path and verifies it's still inside the intended root directory
  before serving anything, rather than trusting the URL segments directly.
- **Chunked upload validation**: uploads are streamed to disk in 1MB chunks
  with a running size check, rejecting oversized files mid-stream rather
  than buffering an arbitrarily large file into memory first or trusting a
  client-declared `Content-Length`.
- **Extension allow-list, not a blocklist**: only `.mp4`, `.mov`, and `.mkv`
  are accepted up front. Deeper validation is left to FFmpeg itself — if the
  file isn't really a valid video, the transcode fails and the job status
  reports `failed` with an error message, rather than trying to hand-roll
  video format detection.
- **No rate limiting**: nothing has been built in to limit the upload endpoint, 
  though any hosting service should feature a basic implementation.

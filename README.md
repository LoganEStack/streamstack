# Stream Stack

A small video streaming app that displays adaptive bitrate streaming: transcoding, HLS packaging, and serving video.


## What it does

- **Browse** a small curated catalog of pre-loaded videos, each served as a
  proper 4-rendition HLS stream (1080p / 720p / 480p / 360p).
- **Watch** any catalog video with a real adaptive-bitrate player (HLS.js),
  including a live rendition meter showing which quality is currently
  playing, manual quality override, and a segment-level "stream inspector"
  panel that shows exactly which `.ts` file is playing, how long is left in
  it, and the raw master manifest on request.
- **Upload** your own video file with no account required. It runs through
  the same FFmpeg pipeline used to build the catalog, transcodes in the
  background, and is served back ephemerally — reachable only via its own
   link, and deleted after a short TTL.


## Why it's built this way

A few decisions here are deliberate trade-offs, not oversights. Worth
understanding the reasoning, since these are the things worth talking about
in an interview:

**No user accounts / auth system.**
Early on this project had JWT auth and a per-user watchlist. Both were cut.
Auth-plus-CRUD is the most common backend portfolio pattern that exists —
building it here would have signaled generic backend competency, not
video-engineering competency. It also didn't actually solve the problem it
looked like it solved: anyone can register for a free account, so "gate
uploads behind auth" doesn't stop abuse unless registration itself is
locked down too. The catalog is public and curated (a handful of
admin-seeded videos); uploads are public but self-contained, size-limited,
and ephemeral — access control comes from possessing an unguessable token,
not from a login.

**Token-based access instead of accounts.**
Every catalog video has a `public_id` — a random opaque identifier
(`secrets.token_urlsafe(8)`), not a sequential database ID and not a hash of
the title. A sequential ID leaks how many videos exist and lets anyone
enumerate the whole catalog by incrementing a counter. A title hash is
guessable and collides across similarly-named videos. A random token is
neither.

Uploads use the same pattern with a longer token
(`secrets.token_urlsafe(16)`) called an `upload_token`. It's a genuine
capability — the only thing standing between a stranger and someone's
uploaded video — so it gets more entropy than `public_id`, which only needs
to resist casual guessing, not function as a real secret.

**FastAPI `BackgroundTasks`, not Celery/RQ.**
Transcoding takes real time and can't block the HTTP request/response
cycle, so it has to run asynchronously in the "background job" sense. A
production system would use a real task queue (Celery, RQ) backed by Redis,
so jobs survive a server restart and can scale across workers. For a
single-machine portfolio project, that's real infrastructure complexity
that doesn't teach anything video-specific — it's generic distributed
systems plumbing. `BackgroundTasks` runs the job in-process after the
response is sent, which is enough to prove the *why* (transcoding can't be
synchronous) without the ops overhead.

**Lazy expiry, with scheduled sweeping planned at deploy time.**
Every upload has an `expires_at`. Right now, expiry is enforced lazily: any
route that touches a job checks the clock first, and deletes expired files
on the way out if they're stale. This catches "someone tries to access an
expired link." It does **not** catch "a job expires and nobody ever checks
back" — those files linger until something touches that route again. The
planned fix (deferred until deployment, see Roadmap) is an in-process
scheduler (APScheduler) running a periodic sweep every few minutes,
independent of any request — the same distinction as cron vs. a one-shot
background task.

**One FFmpeg command with `-var_stream_map`, not four separate encodes.**
The rendition ladder (1080p/720p/480p/360p) is produced in a single FFmpeg
invocation using `-var_stream_map`, which also auto-generates a correct
`master.m3u8`. Early exploration of this project involved hand-writing a
master manifest from four separately-encoded renditions (see `docs/phase2`
notes below) specifically to understand what the automated tooling is
actually doing under the hood before leaning on it.

**Generated thumbnails, not real ones.**
`Video.thumbnail_url` exists as a field, but nothing currently populates it
with a real image — there's no frame-extraction step. The frontend
generates a deterministic placeholder (a title-derived color and waveform
shape) instead of pointing at a broken image path. Real thumbnails would
mean pulling a frame via FFmpeg at transcode time — a legitimate follow-up,
noted in Roadmap.


## Architecture

```
┌────────────────┐       ┌──────────────────┐        ┌─────────────────┐
│    Browser     │──────▶│ FastAPI (8000)    │──────▶│   SQLite          │
│ React + HLS.js │       │  browse/video/media │       │  video, upload_job │
└────────────────┘       │  upload/jobs        │        └─────────────────┘
                         └────────┬───────────┘
                                 │ BackgroundTasks
                                 ▼
                        ┌──────────────────┐
                        │   FFmpeg (subprocess) │
                        │  -var_stream_map      │
                        └────────┬───────────┘
                                 ▼
                        ┌──────────────────┐
                        │  HLS output on disk   │
                        │  master.m3u8 + renditions │
                        └──────────────────┘
```

### Backend (`backend/`)

```
backend/
├── app/
│   ├── main.py            # app entrypoint, CORS, router registration
│   ├── database.py        # SQLModel engine/session setup
│   ├── config.py          # upload limits, rendition ladder, paths
│   ├── models/
│   │   ├── video.py        # Video, VideoPublic, public_id generation
│   │   └── upload_job.py   # UploadJob, JobStatus, upload_token generation
│   ├── browse.py           # GET /browse — catalog listing
│   ├── video_detail.py     # GET /v/{public_id} — single video metadata
│   ├── media.py             # GET /media/{public_id}/... — serves catalog HLS
│   ├── uploads.py           # POST /upload, GET /jobs/{token}, serves ephemeral HLS
│   └── transcode.py         # builds and runs the FFmpeg command
├── seed.py                  # seeds the catalog with sample videos
└── requirements.txt
```

### Frontend (`frontend/`)

```
frontend/
├── src/
│   ├── api.js                    # all backend calls in one place
│   ├── components/
│   │   ├── Nav.jsx
│   │   ├── VideoCard.jsx
│   │   ├── Thumbnail.jsx          # generated placeholder art
│   │   ├── RenditionMeter.jsx     # level-meter UI, doubles as quality selector
│   │   ├── StreamInspector.jsx    # live segment feed + manifest viewer
│   │   ├── Skeleton.jsx
│   │   └── ErrorPanel.jsx
│   └── pages/
│       ├── BrowsePage.jsx
│       ├── WatchPage.jsx
│       └── UploadPage.jsx
```


## API reference

| Method | Path | Description |
|---|---|---|
| `GET`  | `/browse` | List catalog videos (public fields only) |
| `GET`  | `/v/{public_id}` | Single catalog video's metadata |
| `GET`  | `/media/{public_id}/master.m3u8` | Master manifest for a catalog video |
| `GET`  | `/media/{public_id}/{rendition}/{file}` | Rendition manifest or segment |
| `POST` | `/upload` | Upload a file (`multipart/form-data`), returns a job |
| `GET`  | `/jobs/{upload_token}` | Poll job status: `pending → processing → ready \| failed` |
| `GET`  | `/uploads/{upload_token}/master.m3u8` | Master manifest for an ephemeral upload |
| `GET`  | `/uploads/{upload_token}/{rendition}/{file}` | Ephemeral rendition manifest or segment |

Interactive docs are available at `/docs` (FastAPI's auto-generated Swagger UI)
whenever the backend is running.


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
- **DTOs separate internal and external shapes**: `Video` (the real table,
  includes internal fields like `media_slug`) and `VideoPublic` (what
  actually gets returned over the API) are different classes. This is the
  same pattern used for `UploadJob` / `UploadJobPublic`. It means internal
  implementation details — like the on-disk folder name for a video — can
  never accidentally leak into a JSON response.


## Known limitations

- No automated tests yet.
- Scheduled cleanup sweep (APScheduler) is designed but not yet wired in —
  currently relying on lazy (on-access) expiry only. Planned for the deploy
  step.
- Thumbnails are generated placeholders, not real video frames.
- Manual quality selection and the live segment inspector only work with
  HLS.js (Chrome, Firefox, Edge). Safari's native HLS engine doesn't expose
  the same per-segment/per-level events, so those two features degrade to
  "not available" rather than broken, on Safari specifically.
- No rate limiting on the upload endpoint — an acceptable scope cut for a
  single-operator demo project, not for production.


## Background

This project was built in phases as a self-directed path into video
streaming engineering:

1. **Domain concepts** — codecs vs. containers, HLS mechanics, adaptive
   bitrate streaming, CDN behavior, DRM basics, QoE metrics.
2. **FFmpeg fluency** — manually produced a 4-rendition HLS ladder from a
   source file, hand-wrote a `master.m3u8`, and served it locally to
   understand exactly what the automated tooling in Phase 3 does under the
   hood.
3. **Backend** (this repo) — FastAPI serving HLS content with correct MIME
   types and cache headers, a SQLite-backed catalog, and an on-demand
   upload-and-transcode pipeline with background job processing.
4. **Frontend** (this repo) — a React app for browsing, watching, and
   uploading, with a signal-instrument visual identity that reflects the
   subject matter rather than a generic streaming-app look.
5. **Polish and deployment** — in progress.
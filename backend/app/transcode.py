import subprocess
from app.config import RENDITION_LADDER
from app.models import UploadJob, JobStatus
from pathlib import Path
from sqlmodel import Session, select


def build_ffmpeg_command(renditions: list[dict], source_path: Path, output_dir: Path) -> list[str]:
    cmd = ["ffmpeg", "-y", "-i", str(source_path)]

    # Probe for audio stream existence before building the command
    probe = subprocess.run(
        ["ffprobe", "-v", "quiet", "-select_streams", "a:0",
         "-show_entries", "stream=codec_type", "-of", "csv=p=0", str(source_path)],
        capture_output=True, text=True
    )
    has_audio = probe.stdout.strip() == "audio"

    var_stream_map = []
    for i, rung in enumerate(renditions):
        cmd += ["-map", "0:v:0"]
        if has_audio:
            cmd += ["-map", "0:a:0"]

        cmd += [
            f"-filter:v:{i}", f"scale=w={rung['width']}:h={rung['height']}",
            f"-b:v:{i}", rung["bitrate"],
            f"-c:v:{i}", "libx264",
        ]

        if has_audio:
            cmd += [f"-c:a:{i}", "aac"]

        stream_map = f"v:{i},name:{rung['name']}"
        if has_audio:
            stream_map = f"v:{i},a:{i},name:{rung['name']}"
        var_stream_map.append(stream_map)

    cmd += [
        "-f", "hls",
        "-hls_time", "6",
        "-hls_playlist_type", "vod",
        "-hls_segment_filename", str(output_dir / "%v" / "seg%03d.ts"),
        "-master_pl_name", "master.m3u8",
        "-var_stream_map", " ".join(var_stream_map),
        str(output_dir / "%v" / "index.m3u8"),
    ]
    return cmd


def run_transcode_job(upload_token: str, source_path: Path, output_dir: Path, session: Session):
    """Transcode a video, producing HLS output in different renditions."""

    job = session.exec(
        select(UploadJob).where(UploadJob.upload_token == upload_token)
    ).first()

    job.status = JobStatus.processing
    session.add(job)
    session.commit()

    for rung in RENDITION_LADDER:
        (output_dir / rung["name"]).mkdir(parents=True, exist_ok=True)

    cmd = build_ffmpeg_command(RENDITION_LADDER, source_path, output_dir)

    try:
        subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=600)
        job.status = JobStatus.ready
    except subprocess.CalledProcessError as e:
        job.status = JobStatus.failed
        job.error_message = (e.stderr[-500:] if e.stderr else "FFmpeg failed")
    except subprocess.TimeoutExpired:
        job.status = JobStatus.failed
        job.error_message = "Transcoding timed out"

    session.add(job)
    session.commit()
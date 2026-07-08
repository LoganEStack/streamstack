import subprocess
from pathlib import Path
from sqlmodel import Session, select
from app.config import RENDITION_LADDER
from app.models import UploadJob, JobStatus


def build_ffmpeg_command(renditions: list[dict], source_path: Path, output_dir: Path) -> list[str]:
    """
    Builds an FFmpeg command that produces a video rendition for each element in renditions.
    """

    cmd = ["ffmpeg", "-y", "-i", str(source_path)]

    var_stream_map = []
    for i, rung in enumerate(renditions):
        cmd += [
            "-map", "0:v:0", "-map", "0:a:0",
            f"-filter:v:{i}", f"scale=w={rung['width']}:h={rung['height']}",
            f"-b:v:{i}", rung["bitrate"],
            f"-c:v:{i}", "libx264",
            f"-c:a:{i}", "aac",
        ]
        var_stream_map.append(f"v:{i},a:{i},name:{rung['name']}")

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
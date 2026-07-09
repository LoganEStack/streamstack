import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadVideo, getJobStatus } from '../api';
import ErrorPanel from '../components/ErrorPanel';
import styles from './UploadPage.module.css';

const STATUS_COPY = {
  pending: 'Queued',
  processing: 'Transcoding — building HLS rendition ladder',
  ready: 'Ready',
  failed: 'Failed',
};

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    if (job?.status === 'ready') {
      navigate(`/upload/${job.upload_token}`);
    }
  }, [job, navigate]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;

    setError(null);
    setJob(null);

    try {
      const created = await uploadVideo(file);
      setJob(created);

      pollRef.current = setInterval(async () => {
        try {
          const updated = await getJobStatus(created.upload_token);
          setJob(updated);
          if (updated.status === 'ready' || updated.status === 'failed') {
            clearInterval(pollRef.current);
          }
        } catch (err) {
          setError(err.message);
          clearInterval(pollRef.current);
        }
      }, 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.heading}>Upload</h1>
      <p className={styles.blurb}>
        Upload a source file to run it through the same FFmpeg transcode
        pipeline used to build the catalog.
      </p>

      <form onSubmit={handleUpload} className={styles.form}>
        <input
          type="file"
          accept=".mp4,.mov,.mkv"
          onChange={(e) => setFile(e.target.files[0] ?? null)}
          className={styles.fileInput}
        />
        <button type="submit" disabled={!file} className={styles.button}>
          Transcode
        </button>
      </form>

      {error && <ErrorPanel title="Upload failed" message={error} />}

      {job && job.status !== 'ready' && (
        <div className={styles.jobPanel}>
          <div className={styles.jobHeader}>
            <span className={`${styles.statusDot} ${styles[job.status]}`} />
            <span className={styles.statusText}>{STATUS_COPY[job.status]}</span>
          </div>
          {job.status === 'failed' && job.error_message && (
            <pre className={styles.log}>{job.error_message}</pre>
          )}
        </div>
      )}
    </div>
  );
}
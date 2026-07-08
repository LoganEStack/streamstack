import { useEffect, useState } from 'react';
import { listVideos } from '../api';
import VideoCard from '../components/VideoCard';
import styles from './BrowsePage.module.css';

export default function BrowsePage() {
  const [videos, setVideos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    listVideos()
      .then(setVideos)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className={`container ${styles.page}`}>
      <p className="eyebrow">Catalog</p>
      <h1 className={styles.heading}>Browse</h1>

      {error && <p className={styles.error}>Could not reach the backend: {error}</p>}

      {!error && !videos && <p className={styles.status}>Loading catalog…</p>}

      {videos && videos.length === 0 && (
        <p className={styles.status}>No videos in the catalog yet.</p>
      )}

      {videos && videos.length > 0 && (
        <div className={styles.grid}>
          {videos.map((video) => (
            <VideoCard key={video.public_id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}

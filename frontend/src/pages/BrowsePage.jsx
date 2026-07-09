import { useEffect, useState } from 'react';
import { listVideos } from '../api';
import VideoCard from '../components/VideoCard';
import { SkeletonGrid } from '../components/Skeleton';
import ErrorPanel from '../components/ErrorPanel';
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
      <h1 className={styles.heading}>Browse</h1>
      <p className={styles.blurb}>
        A catalog of sample videos, ready to be streamed.
      </p>
      {error && (
        <ErrorPanel
          title="Could not reach the backend"
          message={`${error} — is the FastAPI server running on localhost:8000?`}
        />
      )}

      {!error && !videos && <SkeletonGrid count={4} />}

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

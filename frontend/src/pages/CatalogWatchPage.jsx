import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getVideo, masterPlaylistUrl, fetchMasterManifestText } from '../api';
import WatchPage from './WatchPage';
import ErrorPanel from '../components/ErrorPanel';
import styles from './WatchPage.module.css';

export default function CatalogWatchPage() {
    const { publicId } = useParams();
    const [video, setVideo] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        getVideo(publicId)
            .then(setVideo)
            .catch((err) => setError(err.message));
    }, [publicId]);

    if (error) {
        return (
            <div className={`container ${styles.page}`}>
                <Link to="/" className={styles.back}>← Back to browse</Link>
                <ErrorPanel title="Could not load this video" message={error} />
            </div>
        );
    }

    if (!video) {
        return (
            <div className={`container ${styles.page}`}>
                <Link to="/" className={styles.back}>← Back to browse</Link>
                <div className={styles.layout}>
                    <div className={styles.videoSkeleton} />
                    <div className={styles.sidebarSkeleton} />
                </div>
            </div>
        );
    }

    return (
        <WatchPage
            src={masterPlaylistUrl(publicId)}
            title={video.title}
            description={video.description}
            publicId={publicId}
            onReadManifest={() => fetchMasterManifestText(publicId)}
        />
    );
}
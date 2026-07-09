import { Link } from 'react-router-dom';
import RenditionMeter from './RenditionMeter';
import Thumbnail from './Thumbnail';
import styles from './VideoCard.module.css';

export default function VideoCard({ video }) {
  return (
    <Link to={`/v/${video.public_id}`} className={styles.card}>
      {/* <Thumbnail title={video.title} /> */}
      <img
        src={video.thumbnail_url}
        alt={video.title}
        className={styles.thumbnail}
      />
      <div className={styles.top}>
        <RenditionMeter compact />
        <span className={styles.eyebrow}>HLS · 4 renditions</span>
      </div>
      <h3 className={styles.title}>{video.title}</h3>
      <p className={styles.description}>{video.description}</p>
    </Link>
  );
}

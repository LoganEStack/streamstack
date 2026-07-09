import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  return (
    <div className={`container ${styles.page}`}>
      <p className={styles.code}>404</p>
      <h1 className={styles.heading}>Page not found</h1>
      <p className={styles.blurb}>
        The page you're looking for doesn't exist or has been removed.
      </p>
      <Link to="/" className={styles.link}>← Back to browse</Link>
    </div>
  );
}
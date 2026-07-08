import styles from './Skeleton.module.css';

export function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className={`${styles.block} ${styles.thumb}`} />
      <div className={`${styles.block} ${styles.line}`} style={{ width: '60%' }} />
      <div className={`${styles.block} ${styles.line}`} style={{ width: '90%' }} />
      <div className={`${styles.block} ${styles.line}`} style={{ width: '75%' }} />
    </div>
  );
}

export function SkeletonGrid({ count = 4 }) {
  return (
    <div className={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

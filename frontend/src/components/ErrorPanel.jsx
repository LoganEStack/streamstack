import styles from './ErrorPanel.module.css';

export default function ErrorPanel({ title = 'Something went wrong', message, children }) {
  return (
    <div className={styles.panel}>
      <span className={styles.dot} />
      <div>
        <p className={styles.title}>{title}</p>
        {message && <p className={styles.message}>{message}</p>}
        {children}
      </div>
    </div>
  );
}

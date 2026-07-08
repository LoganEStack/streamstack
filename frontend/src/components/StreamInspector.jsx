import { useEffect, useState } from 'react';
import styles from './StreamInspector.module.css';

function secondsAgo(timestamp) {
  if (!timestamp) return null;
  return Math.max(0, (Date.now() - timestamp) / 1000);
}

export default function StreamInspector({
  currentSegment,
  timeRemaining,
  lastReceived,
  onReadManifest,
}) {
  const [, forceTick] = useState(0);
  const [manifestText, setManifestText] = useState(null);
  const [manifestError, setManifestError] = useState(null);
  const [manifestLoading, setManifestLoading] = useState(false);
  const [manifestOpen, setManifestOpen] = useState(false);

  // Re-render every second so "received Xs ago" stays live without
  // needing its own timer state — it's derived fresh from Date.now() each tick.
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  async function handleReadManifest() {
    if (manifestOpen) {
      setManifestOpen(false);
      return;
    }
    setManifestOpen(true);
    if (manifestText) return; // already fetched, just re-show it

    setManifestLoading(true);
    setManifestError(null);
    try {
      const text = await onReadManifest();
      setManifestText(text);
    } catch (err) {
      setManifestError(err.message);
    } finally {
      setManifestLoading(false);
    }
  }

  const ago = secondsAgo(lastReceived?.receivedAt);

  return (
    <div className={styles.panel}>
      <span className={styles.eyebrow}>Segment feed</span>

      <div className={styles.row}>
        <span className={styles.rowLabel}>Now playing</span>
        <span className={styles.rowValue}>
          {currentSegment ? currentSegment.name : '—'}
        </span>
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>Time remaining</span>
        <span className={styles.rowValue}>
          {currentSegment && timeRemaining !== null ? `${timeRemaining.toFixed(1)}s` : '—'}
        </span>
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>Last received</span>
        <span className={styles.rowValue}>
          {lastReceived ? `${lastReceived.name} · ${ago.toFixed(0)}s ago` : '—'}
        </span>
      </div>

      <button type="button" className={styles.manifestButton} onClick={handleReadManifest}>
        {manifestOpen ? 'Hide master manifest' : 'Read master manifest'}
      </button>

      {manifestOpen && (
        <div className={styles.manifestBox}>
          {manifestLoading && <p className={styles.manifestStatus}>Fetching…</p>}
          {manifestError && <p className={styles.manifestError}>{manifestError}</p>}
          {manifestText && <pre className={styles.manifestText}>{manifestText}</pre>}
        </div>
      )}
    </div>
  );
}

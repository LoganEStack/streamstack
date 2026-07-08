import styles from './RenditionMeter.module.css';

const RUNGS = [
  { label: '1080', height: 100 },
  { label: '720', height: 76 },
  { label: '480', height: 52 },
  { label: '360', height: 34 },
];

export default function RenditionMeter({
  compact = false,
  active = null,
  onSelect = null,
  available = null,
}) {
  return (
    <div
      className={`${styles.meter} ${compact ? styles.compact : ''}`}
      role={onSelect ? 'group' : undefined}
      aria-label={onSelect ? 'Video quality' : undefined}
    >
      {RUNGS.map((rung) => {
        const isActive = rung.label === active;
        const isAvailable = !available || available.includes(rung.label);
        const isClickable = Boolean(onSelect) && isAvailable;

        const content = (
          <>
            <div className={styles.track}>
              <div
                className={`${styles.fill} ${isActive ? styles.activeFill : ''} ${!isAvailable ? styles.unavailableFill : ''}`}
                style={{ height: `${rung.height}%` }}
              />
            </div>
            {!compact && (
              <span className={`${styles.label} ${isActive ? styles.activeLabel : ''}`}>
                {rung.label}
              </span>
            )}
          </>
        );

        if (!onSelect) {
          return (
            <div key={rung.label} className={styles.rung} aria-hidden="true">
              {content}
            </div>
          );
        }

        return (
          <button
            key={rung.label}
            type="button"
            className={`${styles.rung} ${styles.rungButton} ${isActive ? styles.activeRung : ''}`}
            onClick={() => onSelect(rung.label)}
            disabled={!isClickable}
            aria-pressed={isActive}
            aria-label={`${rung.label}p`}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

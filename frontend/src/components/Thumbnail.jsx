import { hueFromString } from '../utils/color';
import styles from './Thumbnail.module.css';

export default function Thumbnail({ title }) {
  const hue = hueFromString(title);
  const style = {
    background: `linear-gradient(135deg, hsl(${hue}, 40%, 14%), hsl(${hue}, 55%, 8%))`,
    borderColor: `hsl(${hue}, 45%, 22%)`,
  };

  return (
    <div className={styles.thumb} style={style} aria-hidden="true">
      <svg className={styles.wave} viewBox="0 0 200 60" preserveAspectRatio="none">
        <polyline
          points={generateWavePoints(title)}
          fill="none"
          stroke={`hsl(${hue}, 70%, 55%)`}
          strokeWidth="1.5"
          opacity="0.65"
        />
      </svg>
      <span className={styles.initial}>{title.charAt(0).toUpperCase()}</span>
    </div>
  );
}

// Turns the title into a stable, squiggle-like polyline so each card
// reads as a distinct "waveform," without needing real audio data.
function generateWavePoints(title) {
  const points = [];
  for (let i = 0; i <= 20; i++) {
    const charCode = title.charCodeAt(i % title.length) || 60;
    const y = 10 + ((charCode * (i + 1)) % 40);
    points.push(`${i * 10},${y}`);
  }
  return points.join(' ');
}

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Hls from 'hls.js';
import { renditionPlaylistUrl, fetchMasterManifestText } from '../api';
import RenditionMeter from '../components/RenditionMeter';
import StreamInspector from '../components/StreamInspector';
import ErrorPanel from '../components/ErrorPanel';
import styles from './WatchPage.module.css';

function labelForHeight(height) {
  if (height >= 1080) return '1080';
  if (height >= 720) return '720';
  if (height >= 480) return '480';
  return '360';
}

export default function WatchPage({ src, title, description, publicId = null, onReadManifest = null }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const nativeHlsRef = useRef(false);
  const currentFragRef = useRef(null);

  const [activeRendition, setActiveRendition] = useState(null);
  const [availableRenditions, setAvailableRenditions] = useState([]);
  const [isAuto, setIsAuto] = useState(true);
  const [currentSegment, setCurrentSegment] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [lastReceived, setLastReceived] = useState(null);

  useEffect(() => {
    if (!src) return;
    const el = videoRef.current;

    function handleTimeUpdate() {
      const frag = currentFragRef.current;
      if (!frag) return;
      const remaining = frag.duration - (el.currentTime - frag.start);
      setTimeRemaining(Math.max(0, remaining));
    }

    if (Hls.isSupported()) {
      nativeHlsRef.current = false;
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(el);
      el.addEventListener('timeupdate', handleTimeUpdate);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const labels = [...new Set(hls.levels.map((l) => labelForHeight(l.height)))];
        setAvailableRenditions(labels);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
        const level = hls.levels[data.level];
        if (level) setActiveRendition(labelForHeight(level.height));
      });

      hls.on(Hls.Events.FRAG_LOADED, (_e, data) => {
        setLastReceived({ name: data.frag.relurl, receivedAt: Date.now() });
      });

      hls.on(Hls.Events.FRAG_CHANGED, (_e, data) => {
        const frag = data.frag;
        currentFragRef.current = { name: frag.relurl, start: frag.start, duration: frag.duration };
        setCurrentSegment({ name: frag.relurl });
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
        el.removeEventListener('timeupdate', handleTimeUpdate);
        currentFragRef.current = null;
        setAvailableRenditions([]);
        setActiveRendition(null);
        setCurrentSegment(null);
        setTimeRemaining(null);
        setLastReceived(null);
      };
    }

    if (el.canPlayType('application/vnd.apple.mpegurl')) {
      nativeHlsRef.current = true;
      setAvailableRenditions(['1080', '720', '480', '360']);
      el.src = src;
      return () => {
        nativeHlsRef.current = false;
        setAvailableRenditions([]);
      };
    }
  }, [src]);

  function handleSelectRendition(label) {
    if (nativeHlsRef.current) {
      const el = videoRef.current;
      if (!el || !publicId) return;
      el.src = renditionPlaylistUrl(publicId, `${label}p`);
      setIsAuto(false);
      setActiveRendition(label);
      return;
    }

    const hls = hlsRef.current;
    if (!hls) return;
    const levelIndex = hls.levels.findIndex((l) => labelForHeight(l.height) === label);
    if (levelIndex === -1) return;
    hls.currentLevel = levelIndex;
    setIsAuto(false);
    setActiveRendition(label);
  }

  function handleReturnToAuto() {
    if (nativeHlsRef.current) {
      const el = videoRef.current;
      if (!el) return;
      el.src = src;
      setIsAuto(true);
      setActiveRendition(null);
      return;
    }

    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = -1;
    setIsAuto(true);
  }

  return (
    <div className={`container ${styles.page}`}>
      <Link to="/" className={styles.back}>← Back to browse</Link>

      <div className={styles.layout}>
        <video ref={videoRef} controls className={styles.video} />

        <aside className={styles.sidebar}>
          <p className="eyebrow">Now playing</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>

          <div className={styles.meterBlock}>
            <div className={styles.meterHeader}>
              <span className={styles.meterLabel}>
                Rendition ladder
                {activeRendition && (
                  <span className={styles.activeTag}> · {activeRendition}p</span>
                )}
              </span>
              <button
                type="button"
                onClick={handleReturnToAuto}
                disabled={isAuto}
                className={styles.autoButton}
              >
                {isAuto ? 'AUTO' : 'AUTO ↺'}
              </button>
            </div>
            <RenditionMeter
              active={activeRendition}
              available={availableRenditions}
              onSelect={handleSelectRendition}
            />
            <p className={styles.hint}>Click a quality to request that rendition.</p>
          </div>

          <StreamInspector
            currentSegment={currentSegment}
            timeRemaining={timeRemaining}
            lastReceived={lastReceived}
            onReadManifest={onReadManifest}
          />
        </aside>
      </div>
    </div>
  );
}
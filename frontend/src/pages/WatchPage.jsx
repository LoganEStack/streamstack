import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Hls from 'hls.js';
import { getVideo, masterPlaylistUrl, renditionPlaylistUrl, fetchMasterManifestText } from '../api';
import RenditionMeter from '../components/RenditionMeter';
import StreamInspector from '../components/StreamInspector';
import ErrorPanel from '../components/ErrorPanel';
import styles from './WatchPage.module.css';

// Maps a level's vertical resolution to the label used in RenditionMeter
function labelForHeight(height) {
  if (height >= 1080) return '1080';
  if (height >= 720) return '720';
  if (height >= 480) return '480';
  return '360';
}

export default function WatchPage() {
  const { publicId } = useParams();
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const nativeHlsRef = useRef(false);
  const currentFragRef = useRef(null); // { name, start, duration } — read inside the timeupdate loop

  const [video, setVideo] = useState(null);
  const [error, setError] = useState(null);
  const [activeRendition, setActiveRendition] = useState(null);
  const [availableRenditions, setAvailableRenditions] = useState([]);
  const [isAuto, setIsAuto] = useState(true);

  const [currentSegment, setCurrentSegment] = useState(null); // { name } — for display
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [lastReceived, setLastReceived] = useState(null); // { name, receivedAt }

  useEffect(() => {
    getVideo(publicId)
      .then(setVideo)
      .catch((err) => setError(err.message));
  }, [publicId]);

  useEffect(() => {
    if (!video) return;
    const src = masterPlaylistUrl(publicId);
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
        const labels = [...new Set(hls.levels.map((level) => labelForHeight(level.height)))];
        setAvailableRenditions(labels);
      });

      // Fires whenever ABR switches quality, including the initial pick,
      // and also fires after a manual override actually takes effect.
      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const level = hls.levels[data.level];
        if (level) setActiveRendition(labelForHeight(level.height));
      });

      // Fires once a segment finishes downloading — this is the "received" moment.
      hls.on(Hls.Events.FRAG_LOADED, (_event, data) => {
        setLastReceived({ name: data.frag.relurl, receivedAt: Date.now() });
      });

      // Fires when playback position enters a new segment — this is "now playing".
      hls.on(Hls.Events.FRAG_CHANGED, (_event, data) => {
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
        setCurrentSegment(null);
        setTimeRemaining(null);
        setLastReceived(null);
      };
    }

    if (el.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari playback: request a specific rendition by loading its playlist.
      // Safari's built-in HLS engine doesn't expose per-segment events the way
      // HLS.js does, so the segment feed panel stays empty on this path.
      nativeHlsRef.current = true;
      setAvailableRenditions(['1080', '720', '480', '360']);
      el.src = src;
      return () => {
        nativeHlsRef.current = false;
        setAvailableRenditions([]);
      };
    }
  }, [video, publicId]);

  function handleSelectRendition(label) {
    if (nativeHlsRef.current) {
      const el = videoRef.current;
      if (!el) return;
      el.src = renditionPlaylistUrl(publicId, `${label}p`);
      setIsAuto(false);
      setActiveRendition(label);
      return;
    }

    const hls = hlsRef.current;
    if (!hls) return;

    // Find the level whose height maps to the clicked label
    const levelIndex = hls.levels.findIndex((lvl) => labelForHeight(lvl.height) === label);
    if (levelIndex === -1) return;

    hls.currentLevel = levelIndex; // forces this rendition, disables ABR
    setIsAuto(false);
    setActiveRendition(label); // reflect immediately, LEVEL_SWITCHED confirms shortly after
  }

  function handleReturnToAuto() {
    if (nativeHlsRef.current) {
      const el = videoRef.current;
      if (!el) return;
      el.src = masterPlaylistUrl(publicId);
      setIsAuto(true);
      setActiveRendition(null);
      return;
    }

    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = -1; // hands control back to ABR
    setIsAuto(true);
  }

  function handleReadManifest() {
    return fetchMasterManifestText(publicId);
  }

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
    <div className={`container ${styles.page}`}>
      <Link to="/" className={styles.back}>← Back to browse</Link>

      <div className={styles.layout}>
        <video ref={videoRef} controls className={styles.video} />

        <aside className={styles.sidebar}>
          <p className="eyebrow">Now playing</p>
          <h1 className={styles.title}>{video.title}</h1>
          <p className={styles.description}>{video.description}</p>

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
            onReadManifest={handleReadManifest}
          />
        </aside>
      </div>
    </div>
  );
}

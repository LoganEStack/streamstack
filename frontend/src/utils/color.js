// Deterministic hash so the same title always produces the same color —
// avoids a random color flashing differently on every re-render.
export function hueFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

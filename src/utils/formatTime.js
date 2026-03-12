/**
 * Converts a number of seconds into a "MM:SS" display string.
 * e.g. 125 → "2:05"
 */
export const formatTime = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
};

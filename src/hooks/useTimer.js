import { useState, useEffect, useRef } from 'react';

// ==========================================
// useTimer — Custom Hook
//
// Why a custom hook?
//   The timer logic (interval, wake lock, start/pause/reset) is
//   self-contained and has nothing to do with UI rendering.
//   Extracting it here means:
//   1. WatchPage stays clean — it just calls start()/pause().
//   2. The timer is independently testable.
//   3. If you later add a "mini-timer" in the NavBar, you can reuse this.
// ==========================================

export const useTimer = (initialSeconds = 0) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isWatching, setIsWatching] = useState(false);
  const wakeLockRef = useRef(null);

  // ── Wake Lock ─────────────────────────────────────────────────────
  // Prevents the phone screen from sleeping while the timer runs.
  // The Screen Wake Lock API is a web standard (Chrome/Edge/Android).
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (_) {}
    }
  };

  const releaseWakeLock = () => {
    wakeLockRef.current?.release().then(() => { wakeLockRef.current = null; });
  };

  // ── Interval ──────────────────────────────────────────────────────
  // useEffect dependency on `isWatching`: the effect re-runs every time
  // isWatching flips, clearing the old interval and starting a new one.
  // The cleanup function (return) is the React way to avoid stale intervals.
  useEffect(() => {
    let interval = null;
    if (isWatching) {
      requestWakeLock();
      interval = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      releaseWakeLock();
    }
    return () => {
      clearInterval(interval);
      releaseWakeLock();
    };
  }, [isWatching]);

  const start = () => setIsWatching(true);
  const pause = () => setIsWatching(false);
  const reset = (value = 0) => { setIsWatching(false); setSeconds(value); };
  const toggle = () => setIsWatching(w => !w);

  return { seconds, isWatching, start, pause, toggle, reset };
};

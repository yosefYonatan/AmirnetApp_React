import React, { useEffect, useRef } from 'react';
import { LEVELS, LEVEL_STYLES } from '../utils/levelSystem';

// ==========================================
// LevelUpOverlay — full-screen level-up celebration
//
// Shown for ~3 s when the user crosses an XP
// threshold during an active session.
// Props: { level: number, onDismiss: () => void }
// ==========================================

const STAR_POSITIONS = [
  { left: '10%', top: '20%', cls: 'star-c', delay: '0ms'   },
  { left: '80%', top: '15%', cls: 'star-r', delay: '80ms'  },
  { left: '25%', top: '70%', cls: 'star-l', delay: '160ms' },
  { left: '70%', top: '65%', cls: 'star-c', delay: '240ms' },
  { left: '50%', top: '10%', cls: 'star-r', delay: '50ms'  },
  { left: '15%', top: '45%', cls: 'star-l', delay: '130ms' },
  { left: '85%', top: '40%', cls: 'star-c', delay: '200ms' },
  { left: '40%', top: '80%', cls: 'star-r', delay: '300ms' },
];

const OverlayStyles = () => (
  <style>{`
    @keyframes lvlCardIn {
      0%   { transform: scale(0.7) translateY(30px); opacity: 0; }
      60%  { transform: scale(1.05) translateY(-4px); opacity: 1; }
      100% { transform: scale(1) translateY(0); opacity: 1; }
    }
    @keyframes starFly  { 0%{transform:translateY(0) scale(1) rotate(0deg);opacity:1} 100%{transform:translateY(-140px) scale(2) rotate(30deg);opacity:0} }
    @keyframes starFlyR { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-110px) translateX(50px) scale(1.8);opacity:0} }
    @keyframes starFlyL { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-110px) translateX(-50px) scale(1.8);opacity:0} }
    .lvl-card { animation: lvlCardIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }
    .star-c   { animation: starFly  1.1s ease-out forwards; }
    .star-r   { animation: starFlyR 1.1s ease-out forwards; }
    .star-l   { animation: starFlyL 1.1s ease-out forwards; }
  `}</style>
);

const LevelUpOverlay = ({ level, onDismiss }) => {
  // Look up tier data directly from the LEVELS array
  const tier   = LEVELS.find(l => l.level === level) ?? LEVELS[0];
  const styles = LEVEL_STYLES[tier.color];

  // Keep a ref so the timeout closure always calls the latest onDismiss
  // without re-starting the timer when the parent re-renders.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);

  // Fire-once on mount — independent of onDismiss identity
  useEffect(() => {
    const t = setTimeout(() => onDismissRef.current(), 3000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <OverlayStyles />

      {/* Floating star particles */}
      <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
        {STAR_POSITIONS.map((s, i) => (
          <span
            key={i}
            className={`absolute text-3xl ${s.cls}`}
            style={{ left: s.left, top: s.top, animationDelay: s.delay }}
          >
            {i % 2 === 0 ? '⭐' : '✨'}
          </span>
        ))}
      </div>

      {/* Backdrop — tap anywhere to dismiss */}
      <div
        className="fixed inset-0 z-[59] bg-black/70 flex items-center justify-center px-6"
        onClick={onDismiss}
      >
        <div
          className={`lvl-card w-full max-w-sm rounded-3xl border p-8 flex flex-col items-center gap-5 text-center shadow-2xl ${styles.bg} ${styles.border}`}
          onClick={e => e.stopPropagation()}
        >
          <div className="text-6xl select-none">🏆</div>

          <div>
            <p className="text-slate-300 text-sm font-bold mb-2">עלית רמה!</p>
            <p className={`font-black text-6xl leading-none ${styles.text}`}>{level}</p>
            <p className={`font-black text-2xl mt-2 ${styles.text}`}>{tier.name}</p>
          </div>

          <p className="text-slate-400 text-sm">המשך כך — אתה מדהים! 🎉</p>

          <button
            onClick={onDismiss}
            className="w-full py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl font-black text-white transition active:scale-95"
          >
            הבנתי, נמשיך!
          </button>
        </div>
      </div>
    </>
  );
};

export default LevelUpOverlay;

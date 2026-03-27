import React from 'react';
import { Flame } from 'lucide-react';
import { useVocab } from '../context/VocabContext';

// ── Animations ────────────────────────────────────────────────────────
const GlobalStatsStyles = () => (
  <style>{`
    @keyframes combo-cycle {
      0%   { color: #a855f7; filter: drop-shadow(0 0 6px #a855f7aa); }
      33%  { color: #3b82f6; filter: drop-shadow(0 0 6px #3b82f6aa); }
      66%  { color: #f97316; filter: drop-shadow(0 0 6px #f97316aa); }
      100% { color: #a855f7; filter: drop-shadow(0 0 6px #a855f7aa); }
    }
    @keyframes goal-pulse {
      0%, 100% { opacity: 1;   transform: scale(1);    }
      50%       { opacity: 0.8; transform: scale(1.15); }
    }
    .gs-flame-combo   { animation: combo-cycle 2.4s linear infinite; }
    .gs-flame-active  { transition: color 0.4s, filter 0.4s; }
    .gs-goal-met      { animation: goal-pulse 1.8s ease infinite; }
    @keyframes gs-bar-fill {
      from { width: 0%; }
    }
    .gs-bar { animation: gs-bar-fill 0.8s cubic-bezier(0.22,1,0.36,1) both; }
  `}</style>
);

// subject → small colored dot config
const SUBJECT_DOT = {
  english: { bg: 'bg-purple-500', ring: 'ring-purple-400', label: 'EN' },
  math:    { bg: 'bg-blue-500',   ring: 'ring-blue-400',   label: 'MA' },
  hebrew:  { bg: 'bg-amber-500',  ring: 'ring-amber-400',  label: 'HE' },
};

// ── Component ─────────────────────────────────────────────────────────
const GlobalStats = () => {
  const { dailyStats, isDailyGoalMet, isCombo, DAILY_XP_GOAL } = useVocab();
  const { xp, subjects } = dailyStats;
  const progress   = Math.min(xp / DAILY_XP_GOAL, 1);
  const isActive   = xp > 0;

  // Flame class
  const flameClass = isCombo
    ? 'gs-flame-combo'
    : isActive
      ? 'gs-flame-active'
      : '';

  // Flame color for single-subject active state
  const flameStyle = (!isCombo && isActive)
    ? { color: 'rgb(var(--sub-glow, 251,146,60))', filter: 'drop-shadow(0 0 5px rgba(var(--sub-glow,251,146,60),0.6))' }
    : (!isActive ? { color: '#475569' } : {});

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 mb-4">
      <GlobalStatsStyles />

      {/* ── Top row: flame + label + subject dots ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame
            size={20}
            className={`flex-shrink-0 ${flameClass} ${isDailyGoalMet ? 'gs-goal-met' : ''}`}
            style={flameStyle}
          />
          <span className="font-black text-sm text-white">יעד יומי</span>
          {isCombo && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500/30 to-orange-500/30 border border-white/15 text-white/80">
              ✨ קומבו
            </span>
          )}
        </div>

        {/* Subject activity pills */}
        <div className="flex items-center gap-1.5">
          {subjects.length === 0 ? (
            <span className="text-[10px] text-slate-500 font-medium">אין פעילות</span>
          ) : (
            subjects.map(s => {
              const cfg = SUBJECT_DOT[s];
              if (!cfg) return null;
              return (
                <span
                  key={s}
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-black text-white ring-1 ring-offset-1 ring-offset-transparent ${cfg.bg} ${cfg.ring}`}
                  title={s}
                >
                  {cfg.label}
                </span>
              );
            })
          )}
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="h-2.5 bg-black/30 rounded-full overflow-hidden" dir="ltr">
        <div
          className="gs-bar h-full rounded-full"
          style={{
            width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, var(--sub-from,#3b82f6), var(--sub-to,#06b6d4))',
            boxShadow: progress > 0 ? '0 0 8px rgba(var(--sub-glow,6,182,212),0.5)' : 'none',
          }}
        />
      </div>

      {/* ── XP label ── */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[11px] font-bold" style={{ color: 'rgba(var(--sub-glow,99,102,241),0.9)' }}>
          {xp} XP היום
        </span>
        <span className="text-[11px] text-slate-500">
          {isDailyGoalMet ? '🏆 יעד הושג!' : `${DAILY_XP_GOAL - xp} XP נותר`}
        </span>
      </div>
    </div>
  );
};

export default GlobalStats;

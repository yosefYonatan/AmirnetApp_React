import React, { useState } from 'react';
import { ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';
import { getMaxSeason, getMaxEpisode, getEpisodeVocab, SHOWS_DB } from '../data/showsDB';

// ==========================================
// EpisodeModal — Season / Episode picker with validation
//
// Requirements:
//   • Default to S1 E1 (no typing required)
//   • +/- spinners for season and episode
//   • Validate against real episode counts from showsDB
//   • Show episode vocab hints if available
//   • Donald Duck spring-pop celebration on confirm
// ==========================================

// ── CSS animations ─────────────────────────────────────────────────────
const EpisodeModalStyles = () => (
  <style>{`
    /* Spring pop-in (mirrors BattlePage donaldPop, scoped to ep- prefix) */
    @keyframes ep-donald-pop {
      0%   { transform: scale(0)    rotate(-18deg); opacity: 0; }
      45%  { transform: scale(1.28) rotate(10deg);  opacity: 1; }
      65%  { transform: scale(0.88) rotate(-6deg);  opacity: 1; }
      80%  { transform: scale(1.07) rotate(3deg);   opacity: 1; }
      90%  { transform: scale(0.97) rotate(-1deg);  opacity: 1; }
      100% { transform: scale(1)    rotate(0deg);   opacity: 1; }
    }
    @keyframes ep-donald-exit {
      0%   { transform: scale(1)   translateY(0);     opacity: 1; }
      100% { transform: scale(0.7) translateY(-72px); opacity: 0; }
    }
    .ep-donald-pop  { animation: ep-donald-pop  0.58s cubic-bezier(0.34,1.56,0.64,1) both; }
    .ep-donald-exit { animation: ep-donald-exit 0.38s cubic-bezier(0.4,0,1,1) forwards; }
  `}</style>
);

// ── Spinner ────────────────────────────────────────────────────────────
const Spinner = ({ label, value, onChange, min = 1, max = 99 }) => (
  <div className="flex-1 flex flex-col items-center gap-2">
    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</span>
    <button
      onClick={() => onChange(Math.min(max, value + 1))}
      disabled={value >= max}
      className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30
        flex items-center justify-center transition active:scale-90
        text-[var(--sub-accent,#60a5fa)]
        hover:shadow-[0_0_10px_rgba(var(--sub-glow,96,165,250),0.5)]"
    >
      <ChevronUp size={20} />
    </button>

    {/* Number display — explicit white + backdrop so it's never invisible */}
    <span className="text-3xl font-black w-14 text-center tabular-nums
      text-white bg-slate-800/60 border border-slate-700/70 rounded-xl py-1 leading-tight">
      {value}
    </span>

    <button
      onClick={() => onChange(Math.max(min, value - 1))}
      disabled={value <= min}
      className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30
        flex items-center justify-center transition active:scale-90
        text-[var(--sub-accent,#60a5fa)]
        hover:shadow-[0_0_10px_rgba(var(--sub-glow,96,165,250),0.5)]"
    >
      <ChevronDown size={20} />
    </button>

    <span className="text-[10px] text-slate-600">מקס׳ {max}</span>
  </div>
);

// ── Main component ─────────────────────────────────────────────────────
const EpisodeModal = ({ show, onConfirm, onCancel }) => {
  const maxSeason = getMaxSeason(show);
  const [season,  setSeason]  = useState(1);
  const [episode, setEpisode] = useState(1);

  // Donald Duck celebration state
  const [celebrating,     setCelebrating]     = useState(false);
  const [celebratingExit, setCelebratingExit] = useState(false);

  const maxEpisode = getMaxEpisode(show, season);

  // When season changes, clamp episode to valid range
  const handleSeasonChange = (newSeason) => {
    setSeason(newSeason);
    const newMax = getMaxEpisode(show, newSeason);
    if (episode > newMax) setEpisode(newMax);
  };

  // Confirm: play Donald for 1.5 s, then navigate
  const handleStart = () => {
    if (!isValid || celebrating) return;
    setCelebrating(true);
    setCelebratingExit(false);
    setTimeout(() => setCelebratingExit(true),  1100); // start exit at 1.1 s
    setTimeout(() => {
      setCelebrating(false);
      setCelebratingExit(false);
      onConfirm(episodeLabel);
    }, 1500);
  };

  // Episode vocab hints for current selection
  const hint     = getEpisodeVocab(show, season, episode);
  const showData = SHOWS_DB[show];

  const episodeLabel = `עונה ${season} פרק ${episode}`;
  const isValid      = maxEpisode > 0; // maxEpisode=0 means invalid season

  return (
    <>
      <EpisodeModalStyles />

      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-3xl border border-slate-700 w-full max-w-sm shadow-2xl overflow-hidden">

          {/* Show banner */}
          {showData && (
            <div className={`bg-gradient-to-br ${showData.gradient} p-4 flex items-center gap-3`}>
              <span className="text-3xl">{showData.emoji}</span>
              <div>
                <p className="font-black text-white text-base leading-tight">{show}</p>
                <p className="text-white/70 text-xs">{showData.description}</p>
              </div>
            </div>
          )}

          <div className="p-6">
            <h2 className="text-xl font-black mb-5 text-center text-white">איזה פרק?</h2>

            {/* Spinners side by side */}
            <div className="flex justify-center gap-8 mb-6">
              <Spinner
                label="עונה"
                value={season}
                onChange={handleSeasonChange}
                max={maxSeason}
              />
              <Spinner
                label="פרק"
                value={episode}
                onChange={setEpisode}
                max={maxEpisode > 0 ? maxEpisode : 1}
              />
            </div>

            {/* Invalid season warning */}
            {!isValid && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded-xl p-3 mb-4">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>עונה {season} לא קיימת ב-{show}</span>
              </div>
            )}

            {/* Selected episode — high-contrast subject-accent color */}
            <p className="font-black text-sm mb-4 text-center text-[var(--sub-accent,#60a5fa)]">
              {episodeLabel}
            </p>

            {/* Episode vocab hint (if available) */}
            {hint && (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3 mb-5 text-right">
                <p className="text-xs text-slate-500 mb-1.5 font-bold">על מה הפרק:</p>
                <p className="text-slate-300 text-xs leading-relaxed">{hint.summary}</p>
                {hint.words?.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {hint.words.map(w => (
                      <span key={w} dir="ltr" className="text-[10px] bg-blue-900/40 border border-blue-800/30 text-blue-300 px-2 py-0.5 rounded-lg font-mono">
                        {w}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition text-white"
              >
                ביטול
              </button>
              <button
                onClick={handleStart}
                disabled={!isValid || celebrating}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl font-bold transition shadow-lg text-white"
              >
                התחל צפייה ▶
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Donald Duck spring-pop celebration (1.5 s, then navigates) */}
      {celebrating && (
        <div className="pointer-events-none fixed inset-0 z-[60] flex items-end justify-center pb-36">
          <img
            src="/donald-duck.gif"
            alt=""
            draggable={false}
            className={`w-36 h-36 object-contain select-none ${celebratingExit ? 'ep-donald-exit' : 'ep-donald-pop'}`}
            style={{
              filter:
                'drop-shadow(0 0 12px rgba(0,230,255,0.85)) ' +
                'drop-shadow(0 0 28px rgba(0,200,255,0.50))',
            }}
          />
        </div>
      )}
    </>
  );
};

export default EpisodeModal;

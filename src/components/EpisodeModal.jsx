import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

// ==========================================
// EpisodeModal — Season / Episode picker
//
// Requirements:
//   • Default to S1 E1 (no typing required)
//   • +/- spinners for season and episode
//   • Confirm immediately (no text entry)
// ==========================================

// Reusable numeric spinner — increment / decrement with min cap
const Spinner = ({ label, value, onChange, min = 1, max = 99 }) => (
  <div className="flex-1 flex flex-col items-center gap-2">
    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</span>
    <button
      onClick={() => onChange(Math.min(max, value + 1))}
      className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition active:scale-90"
    >
      <ChevronUp size={20} />
    </button>
    <span className="text-3xl font-black w-12 text-center tabular-nums">{value}</span>
    <button
      onClick={() => onChange(Math.max(min, value - 1))}
      className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition active:scale-90"
    >
      <ChevronDown size={20} />
    </button>
  </div>
);

const EpisodeModal = ({ show, onConfirm, onCancel }) => {
  const [season,  setSeason]  = useState(1);
  const [episode, setEpisode] = useState(1);

  // Produces a readable string like "עונה 2 פרק 5"
  const episodeLabel = `עונה ${season} פרק ${episode}`;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 p-8 rounded-3xl border border-slate-700 w-full max-w-sm text-center shadow-2xl">
        <h2 className="text-2xl font-black mb-1">איזה פרק?</h2>
        <p className="text-slate-400 mb-6 text-sm">{show}</p>

        {/* Spinners side by side */}
        <div className="flex justify-center gap-8 mb-8">
          <Spinner label="עונה" value={season}  onChange={setSeason}  />
          <Spinner label="פרק"  value={episode} onChange={setEpisode} />
        </div>

        {/* Preview of generated label */}
        <p className="text-blue-400 font-bold text-sm mb-6">{episodeLabel}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition"
          >
            ביטול
          </button>
          <button
            onClick={() => onConfirm(episodeLabel)}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition shadow-lg"
          >
            התחל צפייה ▶
          </button>
        </div>
      </div>
    </div>
  );
};

export default EpisodeModal;

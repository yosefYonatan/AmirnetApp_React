import React, { useState, useMemo, useCallback } from 'react';
import { BookOpen, CheckCircle2, XCircle, HelpCircle, ChevronLeft, ChevronRight, Clapperboard, Loader2, X } from 'lucide-react';
import { useVocab, WORD_STATUS } from '../context/VocabContext';
import rawData from '../data/academicDB.json';

// ==========================================
// VocabularyPage — Academic Database Library
//
// Shows all 538+ academic words divided into units of 50.
// Each word has 3 status buttons + AI "Show Context" button.
// ==========================================

const UNIT_SIZE = 50;
const ALL_WORDS = [...rawData].sort((a, b) => a.word.localeCompare(b.word));
const TOTAL_UNITS = Math.ceil(ALL_WORDS.length / UNIT_SIZE);

const POS_COLORS = {
  Verb:      'text-blue-400 bg-blue-900/30',
  Noun:      'text-green-400 bg-green-900/30',
  Adjective: 'text-purple-400 bg-purple-900/30',
  Adverb:    'text-amber-400 bg-amber-900/30',
};

const LevelDots = ({ level }) => (
  <span className="flex gap-0.5 items-center">
    {[1, 2, 3].map(i => (
      <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= level ? 'bg-blue-400' : 'bg-slate-700'}`} />
    ))}
  </span>
);


// AI sentence panel shown inline below a word card
const SentencePanel = ({ word, show, translation, onClose }) => {
  const [sentence, setSentence] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res  = await fetch('/api/generate-sentence', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ word, show, translation }),
      });
      const data = await res.json();
      setSentence(data.sentence ?? null);
      if (!data.sentence) setError(true);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [word, show, translation]);

  React.useEffect(() => { generate(); }, [generate]);

  return (
    <div className="mt-1 mb-1 bg-slate-800/80 border border-indigo-700/30 rounded-xl p-3 flex items-start gap-3">
      <Clapperboard size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {loading && (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Loader2 size={14} className="animate-spin" /> יוצר משפט...
          </div>
        )}
        {!loading && error && (
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-sm">לא הצלחנו ליצור משפט</span>
            <button onClick={generate} className="text-xs text-blue-400 hover:text-blue-300">נסה שוב</button>
          </div>
        )}
        {!loading && sentence && (
          <p dir="ltr" className="text-slate-200 text-sm leading-relaxed italic">{sentence}</p>
        )}
        {show && sentence && (
          <p className="text-indigo-400/60 text-xs mt-1">הקשר: {show}</p>
        )}
      </div>
      <button onClick={onClose} className="text-slate-600 hover:text-slate-400 transition flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  );
};

const VocabularyPage = () => {
  const { wordStatuses, setWordStatus, selectedShow } = useVocab();
  const [unit, setUnit]           = useState(0);
  const [aiWordKey, setAiWordKey] = useState(null);

  const unitWords = useMemo(
    () => ALL_WORDS.slice(unit * UNIT_SIZE, (unit + 1) * UNIT_SIZE),
    [unit]
  );

  const unitStats = useMemo(() => {
    let known = 0, unknown = 0, uncertain = 0;
    unitWords.forEach(w => {
      const s = wordStatuses[w.word.toLowerCase()];
      if (s === WORD_STATUS.KNOWN)     known++;
      if (s === WORD_STATUS.UNKNOWN)   unknown++;
      if (s === WORD_STATUS.UNCERTAIN) uncertain++;
    });
    return { known, unknown, uncertain, total: unitWords.length };
  }, [unitWords, wordStatuses]);

  const handleStatus = (word, status) => {
    const key     = word.toLowerCase();
    const current = wordStatuses[key];
    setWordStatus(word, current === status ? null : status);
  };

  const goToUnit = (u) => {
    setUnit(u);
    setAiWordKey(null);
    window.scrollTo(0, 0);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-4 pb-4 space-y-4">

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800/60 p-5 rounded-3xl border border-slate-700/60">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <BookOpen size={22} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="font-black text-lg text-white leading-tight">אוצר מילים אקדמי</h2>
            <p className="text-slate-500 text-sm">{ALL_WORDS.length} מילים · {TOTAL_UNITS} יחידות</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/20 border border-green-800/30 px-2.5 py-1 rounded-lg">
            <CheckCircle2 size={12} /> ידוע
          </span>
          <span className="flex items-center gap-1 text-xs text-red-400 bg-red-900/20 border border-red-800/30 px-2.5 py-1 rounded-lg">
            <XCircle size={12} /> לא ידוע
          </span>
          <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-900/20 border border-amber-800/30 px-2.5 py-1 rounded-lg">
            <HelpCircle size={12} /> לא בטוח
          </span>
          <span className="flex items-center gap-1 text-xs text-indigo-400 bg-indigo-900/20 border border-indigo-800/30 px-2.5 py-1 rounded-lg">
            <Clapperboard size={12} /> הקשר AI
          </span>
        </div>
      </div>

      {/* Unit Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <button
            onClick={() => goToUnit(Math.max(0, unit - 1))}
            disabled={unit === 0}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 flex items-center justify-center transition"
          >
            <ChevronRight size={18} />
          </button>
          <div className="flex-1 text-center">
            <span className="font-black text-white">יחידה {unit + 1}</span>
            <span className="text-slate-500 text-sm"> / {TOTAL_UNITS}</span>
          </div>
          <button
            onClick={() => goToUnit(Math.min(TOTAL_UNITS - 1, unit + 1))}
            disabled={unit === TOTAL_UNITS - 1}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 flex items-center justify-center transition"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Dynamic sliding window */}
        {(() => {
          const WINDOW      = 5;
          const windowStart = Math.max(0, Math.min(unit - Math.floor(WINDOW / 2), TOTAL_UNITS - WINDOW));
          const windowEnd   = Math.min(TOTAL_UNITS, windowStart + WINDOW);
          const indices     = Array.from({ length: windowEnd - windowStart }, (_, i) => windowStart + i);
          return (
            <div className="flex items-center gap-1 justify-center">
              {windowStart > 0 && (
                <button onClick={() => goToUnit(0)}
                  className="text-xs px-2 py-1 rounded-lg text-slate-500 hover:text-slate-300 transition font-bold">
                  1…
                </button>
              )}
              {indices.map(i => (
                <button key={i} onClick={() => goToUnit(i)}
                  className={`text-xs px-3 py-2 rounded-xl font-black transition-all active:scale-90 min-w-[38px]
                    ${i === unit ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 scale-110' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
                  {i + 1}
                </button>
              ))}
              {windowEnd < TOTAL_UNITS && (
                <button onClick={() => goToUnit(TOTAL_UNITS - 1)}
                  className="text-xs px-2 py-1 rounded-lg text-slate-500 hover:text-slate-300 transition font-bold">
                  …{TOTAL_UNITS}
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Stats bar */}
      <div className="flex gap-2">
        <div className="flex-1 bg-green-900/20 border border-green-800/30 rounded-xl p-2 text-center">
          <div className="font-black text-green-400 text-lg">{unitStats.known}</div>
          <div className="text-[10px] text-slate-500">ידוע</div>
        </div>
        <div className="flex-1 bg-red-900/20 border border-red-800/30 rounded-xl p-2 text-center">
          <div className="font-black text-red-400 text-lg">{unitStats.unknown}</div>
          <div className="text-[10px] text-slate-500">לא ידוע</div>
        </div>
        <div className="flex-1 bg-amber-900/20 border border-amber-800/30 rounded-xl p-2 text-center">
          <div className="font-black text-amber-400 text-lg">{unitStats.uncertain}</div>
          <div className="text-[10px] text-slate-500">לא בטוח</div>
        </div>
        <div className="flex-1 bg-slate-800/60 border border-slate-700/40 rounded-xl p-2 text-center">
          <div className="font-black text-slate-300 text-lg">
            {unitStats.total - unitStats.known - unitStats.unknown - unitStats.uncertain}
          </div>
          <div className="text-[10px] text-slate-500">לא דורג</div>
        </div>
      </div>

      {/* Word list */}
      <div className="space-y-2">
        {unitWords.map((entry, idx) => {
          const key         = entry.word.toLowerCase();
          const status      = wordStatuses[key];
          const isKnown     = status === WORD_STATUS.KNOWN;
          const isUnknown   = status === WORD_STATUS.UNKNOWN;
          const isUncertain = status === WORD_STATUS.UNCERTAIN;
          const aiOpen      = aiWordKey === key;

          const borderColor = isKnown     ? 'border-green-800/50'
                            : isUnknown   ? 'border-red-800/50'
                            : isUncertain ? 'border-amber-800/50'
                            :               'border-slate-800';
          const bgColor     = isKnown     ? 'bg-green-950/25'
                            : isUnknown   ? 'bg-red-950/25'
                            : isUncertain ? 'bg-amber-950/25'
                            :               'bg-slate-900';

          return (
            <div key={entry.word}>
              <div className={`rounded-2xl border overflow-hidden transition-all ${bgColor} ${borderColor}`}>
                {/* Word info row */}
                <div className="p-4 flex items-start gap-3">
                  <span className="text-xs text-slate-600 font-mono w-6 flex-shrink-0 mt-1">
                    {unit * UNIT_SIZE + idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span dir="ltr" className="font-black text-white text-lg leading-tight break-all">{entry.word}</span>
                      {entry.level && <LevelDots level={entry.level} />}
                      {entry.pos && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${POS_COLORS[entry.pos] ?? 'text-slate-400 bg-slate-800'}`}>
                          {entry.pos}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 text-sm mt-1 leading-snug">{entry.translation}</p>
                  </div>
                  {/* AI button */}
                  <button
                    onClick={() => setAiWordKey(aiOpen ? null : key)}
                    title="הקשר בסדרה (AI)"
                    className={`p-2 rounded-xl transition-all active:scale-90 flex-shrink-0
                      ${aiOpen ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800/80 text-slate-500 hover:text-indigo-400'}`}
                  >
                    <Clapperboard size={15} />
                  </button>
                </div>

                {/* Status button row — 3 big tappable buttons */}
                <div className="grid grid-cols-3 border-t border-slate-800/60">
                  <button
                    onClick={() => handleStatus(entry.word, WORD_STATUS.KNOWN)}
                    className={`py-3 flex items-center justify-center gap-2 text-sm font-black transition-all active:scale-95
                      ${isKnown
                        ? 'bg-green-700/40 text-green-300'
                        : 'text-slate-500 hover:bg-green-900/20 hover:text-green-400'}`}
                  >
                    <CheckCircle2 size={17} strokeWidth={isKnown ? 2.5 : 1.75} />
                    <span>ידוע</span>
                  </button>
                  <button
                    onClick={() => handleStatus(entry.word, WORD_STATUS.UNKNOWN)}
                    className={`py-3 flex items-center justify-center gap-2 text-sm font-black transition-all active:scale-95 border-x border-slate-800/60
                      ${isUnknown
                        ? 'bg-red-700/40 text-red-300'
                        : 'text-slate-500 hover:bg-red-900/20 hover:text-red-400'}`}
                  >
                    <XCircle size={17} strokeWidth={isUnknown ? 2.5 : 1.75} />
                    <span>לא ידוע</span>
                  </button>
                  <button
                    onClick={() => handleStatus(entry.word, WORD_STATUS.UNCERTAIN)}
                    className={`py-3 flex items-center justify-center gap-2 text-sm font-black transition-all active:scale-95
                      ${isUncertain
                        ? 'bg-amber-700/40 text-amber-300'
                        : 'text-slate-500 hover:bg-amber-900/20 hover:text-amber-400'}`}
                  >
                    <HelpCircle size={17} strokeWidth={isUncertain ? 2.5 : 1.75} />
                    <span>לא בטוח</span>
                  </button>
                </div>
              </div>

              {/* AI sentence panel */}
              {aiOpen && (
                <SentencePanel
                  word={entry.word}
                  show={selectedShow}
                  translation={entry.translation}
                  onClose={() => setAiWordKey(null)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom nav */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => goToUnit(Math.max(0, unit - 1))}
          disabled={unit === 0}
          className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-2xl font-bold transition flex items-center justify-center gap-2"
        >
          <ChevronRight size={18} /> יחידה קודמת
        </button>
        <button
          onClick={() => goToUnit(Math.min(TOTAL_UNITS - 1, unit + 1))}
          disabled={unit === TOTAL_UNITS - 1}
          className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 rounded-2xl font-bold transition flex items-center justify-center gap-2"
        >
          יחידה הבאה <ChevronLeft size={18} />
        </button>
      </div>
    </div>
  );
};

export default VocabularyPage;

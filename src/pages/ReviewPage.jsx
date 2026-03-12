import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ListChecks, CheckCircle2 } from 'lucide-react';
import { useVocab } from '../context/VocabContext';
import WordCard from '../components/WordCard';
import { psychometricDB } from '../data/psychometricDB';

// ==========================================
// ReviewPage — study dashboard for one episode
//
// The user can:
//   - See all captured words with their scores
//   - Filter to Amirnet-relevant words only (score ≥ 70)
//   - Select words for the exam
//   - Start the exam with selected words
// ==========================================

// Build the available exam-length options based on how many words are selected.
// Rules:
//   ≤ 5 words → no picker (use all)
//   6-9 words → [5, count]
//   10-14 words → [5, 10, count]  (count hidden if it equals 10)
//   ≥ 15 words → [5, 10, 15]
const getExamOptions = (count) => {
  if (count <= 5) return [];
  const standard = [5, 10, 15].filter(n => n < count);
  // Add "all" if count is not already one of the standard steps
  if (!standard.includes(count)) standard.push(count);
  return standard;
};

const ReviewPage = () => {
  const navigate = useNavigate();
  const { currentEpisodeWords, reanalyzeWord, setExamWords, selectedShow, selectedEpisode } = useVocab();
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filterHigh, setFilterHigh] = useState(false);
  const [examLength, setExamLength] = useState(0); // 0 = use all selected

  // Exclude invalid words from the selectable/displayed list
  const validWords = currentEpisodeWords.filter(w => !w.invalid);
  const displayWords = filterHigh
    ? validWords.filter(w => w.score >= 70)
    : validWords;

  // Also show invalid words (but not selectable) so user can see what was rejected
  const invalidWords = currentEpisodeWords.filter(w => w.invalid);

  const allSelected = displayWords.length > 0 && selectedIds.size === displayWords.length;

  const toggleWord = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayWords.filter(w => !w.invalid).map(w => w.id)));
  };

  // ── Exam Generation ────────────────────────────────────────────────
  const startExam = () => {
    if (selectedIds.size < 2) return;
    let wordsToTest = displayWords.filter(w => selectedIds.has(w.id));
    // Shuffle, then trim to selected length (0 = all)
    wordsToTest = wordsToTest.sort(() => 0.5 - Math.random());
    const limit = examLength > 0 ? examLength : wordsToTest.length;
    wordsToTest = wordsToTest.slice(0, limit);
    const allTranslations = Object.values(psychometricDB);

    const generated = wordsToTest.map(word => {
      const distractors = allTranslations
        .filter(t => t !== word.translation)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
      const options = [...distractors, word.translation].sort(() => 0.5 - Math.random());
      return { ...word, options };
    });

    setExamWords(generated);
    navigate('/exam');
  };

  if (!selectedShow || !selectedEpisode) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 text-center px-4">
        <ListChecks size={48} className="mb-4 opacity-40" />
        <p className="text-lg font-bold">אין פרק פעיל</p>
        <p className="text-sm mt-1">התחל צפייה מדף "צפייה" כדי לאסוף מילים</p>
      </div>
    );
  }

  if (currentEpisodeWords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 text-center px-4">
        <ListChecks size={48} className="mb-4 opacity-40" />
        <p className="text-lg font-bold">אין מילים עדיין</p>
        <p className="text-sm mt-1">חזור לצפייה והוסף מילים בזמן הצפייה</p>
      </div>
    );
  }

  const amirnetCount = validWords.filter(w => w.inDatabase).length;
  const amirnetPct = validWords.length > 0
    ? Math.round((amirnetCount / validWords.length) * 100)
    : 0;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-4 space-y-4">
      {/* Header with stats */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800/60 p-5 rounded-3xl border border-slate-700/60">
        <div className="font-black text-lg leading-tight">{selectedShow}</div>
        <div className="text-slate-500 text-sm mb-4">{selectedEpisode}</div>
        <div className="flex gap-3">
          <div className="flex-1 bg-slate-800/60 rounded-2xl p-3 text-center">
            <div className="text-2xl font-black text-white">{validWords.length}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">מילים</div>
          </div>
          <div className="flex-1 bg-green-900/20 border border-green-800/30 rounded-2xl p-3 text-center">
            <div className="text-2xl font-black text-green-400">{amirnetCount}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">אמירנט</div>
          </div>
          <div className="flex-1 bg-blue-900/20 border border-blue-800/30 rounded-2xl p-3 text-center">
            <div className="text-2xl font-black text-blue-400">{amirnetPct}%</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">כיסוי</div>
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setFilterHigh(f => !f)}
          className={`text-sm px-4 py-2.5 rounded-2xl border font-bold transition active:scale-95
            ${filterHigh
              ? 'bg-green-900/40 border-green-700 text-green-400'
              : 'bg-slate-800 border-slate-700 text-slate-400'}`}
        >
          {filterHigh ? '✓ אמירנט בלבד' : 'הצג הכל'}
        </button>

        <button
          onClick={toggleAll}
          className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-2xl border border-slate-700 bg-slate-800 text-slate-400 font-bold transition active:scale-95"
        >
          <CheckCircle2 size={16} />
          {allSelected ? 'בטל הכל' : 'בחר הכל'}
        </button>
      </div>

      {/* Word list */}
      <div className="space-y-2.5">
        {displayWords.map(w => (
          <WordCard
            key={w.id}
            word={w}
            onReanalyze={reanalyzeWord}
            selectable
            selected={selectedIds.has(w.id)}
            onToggle={() => toggleWord(w.id)}
          />
        ))}
      </div>

      {/* Invalid words (not selectable) */}
      {invalidWords.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-red-500/60 px-1">מילים שגויות (לא זמינות למבחן)</h3>
          {invalidWords.map(w => (
            <WordCard key={w.id} word={w} onReanalyze={reanalyzeWord} />
          ))}
        </div>
      )}

      {/* Exam length selector + Start CTA */}
      {selectedIds.size >= 2 && (() => {
        const options = getExamOptions(selectedIds.size);
        // effective = how many words will actually be in the exam
        const effective = examLength > 0 ? examLength : selectedIds.size;
        return (
          <div className="sticky bottom-20 pb-2 space-y-3">
            {/* Length picker — only shown when there are real choices */}
            {options.length > 1 && (
              <div className="bg-slate-900/90 backdrop-blur rounded-2xl p-3 border border-slate-800 flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold flex-shrink-0">מספר שאלות:</span>
                <div className="flex gap-2 flex-1 justify-end">
                  {options.map(n => {
                    const active = (examLength === 0 && n === selectedIds.size) || examLength === n;
                    return (
                      <button
                        key={n}
                        onClick={() => setExamLength(n === selectedIds.size ? 0 : n)}
                        className={`px-4 py-2 rounded-xl text-base font-black transition active:scale-95 min-w-[48px]
                          ${active ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <button
              onClick={startExam}
              className="w-full py-5 bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-blue-900/30 transition"
            >
              <GraduationCap size={26} />
              התחל מבחן ({effective} מילים)
            </button>
          </div>
        );
      })()}
    </div>
  );
};

export default ReviewPage;

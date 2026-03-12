import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, RefreshCw, BookOpen, CheckCircle2, XCircle, Star } from 'lucide-react';
import { useVocab } from '../context/VocabContext';

const ScoreRing = ({ score, total }) => {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;
  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#eab308' : '#ef4444';
  const label = pct >= 80 ? 'מעולה!' : pct >= 60 ? 'כמעט שם!' : 'תרגל עוד';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-white">{pct}%</span>
          <span className="text-xs text-slate-400">{score}/{total}</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-bold" style={{ color }}>{label}</span>
    </div>
  );
};

const ResultsPage = () => {
  const navigate = useNavigate();
  const { examWords, examResults } = useVocab();

  if (!examResults && (!examWords || examWords.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 text-center px-4">
        <Award size={56} className="mb-4 opacity-30" />
        <p className="text-xl font-bold text-slate-400">אין תוצאות עדיין</p>
        <p className="text-sm mt-2">סיים מבחן כדי לראות את הציון</p>
        <button
          onClick={() => navigate('/review')}
          className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition"
        >
          לסקירה
        </button>
      </div>
    );
  }

  // Use detailed results if available (from ExamPage), otherwise fallback to examWords count
  const score = examResults?.score ?? 0;
  const total = examResults?.total ?? examWords?.length ?? 0;
  const resultList = examResults?.results ?? examWords?.map(w => ({ ...w, correct: null })) ?? [];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-6 space-y-6">
      {/* Score card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl">
        <Award className="text-yellow-400" size={32} />
        <ScoreRing score={score} total={total} />
        <p className="text-slate-400 text-sm">המבחן הסתיים!</p>
      </div>

      {/* Word breakdown */}
      {resultList.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">תוצאות לפי מילה</h3>
          {resultList.map((w, i) => (
            <div
              key={i}
              className={`rounded-2xl p-4 flex items-center gap-3 border transition-all
                ${w.correct === true ? 'bg-green-900/20 border-green-800/50' :
                  w.correct === false ? 'bg-red-900/20 border-red-800/50' :
                  'bg-slate-900 border-slate-800'}`}
            >
              <div className="flex-shrink-0">
                {w.correct === true  ? <CheckCircle2 size={20} className="text-green-400" /> :
                 w.correct === false ? <XCircle size={20} className="text-red-400" /> :
                 <Star size={20} className="text-slate-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <span dir="ltr" className="font-black text-white">{w.word}</span>
                <p className="text-slate-400 text-sm">{w.translation}</p>
                {w.correct === false && w.chosen && (
                  <p className="text-red-400/80 text-xs mt-0.5">בחרת: {w.chosen}</p>
                )}
              </div>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full border flex-shrink-0
                ${w.score >= 80 ? 'bg-green-900/40 text-green-400 border-green-700/30'
                  : w.score >= 50 ? 'bg-yellow-900/40 text-yellow-400 border-yellow-700/30'
                  : 'bg-red-900/40 text-red-400 border-red-700/30'}`}
              >
                {w.score}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pb-4">
        <button
          onClick={() => navigate('/exam')}
          className="flex-1 py-5 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition border border-slate-700"
        >
          <RefreshCw size={22} /> נסה שוב
        </button>
        <button
          onClick={() => navigate('/review')}
          className="flex-1 py-5 bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition"
        >
          <BookOpen size={22} /> סקירה
        </button>
      </div>
    </div>
  );
};

export default ResultsPage;

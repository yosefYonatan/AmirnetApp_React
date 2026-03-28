import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Flame, Zap, Trophy, Clock, AlertTriangle } from 'lucide-react';
import { useVocab, SUBJECTS } from '../context/VocabContext';
import MathNumpad from '../components/MathNumpad';
import {
  generateQuestion,
  calculateAnalytics,
  CATEGORIES,
} from '../utils/mathLogic';

// ── CSS animations (CSS-only, no Framer Motion) ───────────────────────
const SurvivalStyles = () => (
  <style>{`
    /* Timer bar drains left-to-right over TIME_LIMIT_MS */
    @keyframes timer-drain {
      from { width: 100%; }
      to   { width: 0%;   }
    }
    .timer-bar {
      animation: timer-drain linear forwards;
      transition: background-color 0.4s;
    }

    /* Screen shake — triggered on every 5-streak milestone */
    @keyframes shake {
      0%,100% { transform: translateX(0);   }
      15%      { transform: translateX(-7px); }
      30%      { transform: translateX(7px);  }
      45%      { transform: translateX(-5px); }
      60%      { transform: translateX(5px);  }
      75%      { transform: translateX(-3px); }
    }
    .screen-shake { animation: shake 0.5s ease; }

    /* "MATHEMATICIAN!" neon burst */
    @keyframes math-burst {
      0%   { opacity: 0; transform: scale(0.4) rotate(-4deg); }
      25%  { opacity: 1; transform: scale(1.15) rotate(1deg);  }
      70%  { opacity: 1; transform: scale(1)   rotate(0deg);  }
      100% { opacity: 0; transform: scale(0.85) rotate(-1deg); }
    }
    .math-burst { animation: math-burst 1.6s cubic-bezier(0.22,1,0.36,1) forwards; }

    /* StarBurst particles on hard-square correct answers */
    @keyframes particle-fly {
      0%   { transform: translate(0,0) scale(1.2); opacity: 1; }
      100% { transform: translate(var(--px),var(--py)) scale(0); opacity: 0; }
    }
    .math-particle { animation: particle-fly 0.65s ease-out forwards; }

    /* Question entrance */
    @keyframes q-pop {
      0%   { opacity: 0; transform: scale(0.82) translateY(12px); }
      100% { opacity: 1; transform: scale(1)    translateY(0);    }
    }
    .q-pop { animation: q-pop 0.22s cubic-bezier(0.22,1,0.36,1) both; }

    /* Wrong-answer flash */
    @keyframes wrong-flash {
      0%,100% { background-color: transparent; }
      40%      { background-color: rgba(239,68,68,0.18); }
    }
    .wrong-flash { animation: wrong-flash 0.4s ease; }

    /* Input cursor blink */
    @keyframes cursor-blink {
      0%,100% { opacity: 1; }
      50%      { opacity: 0; }
    }
    .cursor { animation: cursor-blink 0.9s step-end infinite; }

    /* Results cards entrance */
    @keyframes slide-in {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0);    }
    }
    .slide-in { animation: slide-in 0.4s ease both; }
  `}</style>
);

// ── Constants ─────────────────────────────────────────────────────────
const TIME_LIMIT_MS     = 3000;   // ms per question
const TICK_MS           = 80;     // timer polling interval
const STREAK_MILESTONE  = 5;      // "MATHEMATICIAN!" every N correct
const PARTICLE_COUNT    = 12;
const PARTICLE_COLORS   = ['#a855f7','#3b82f6','#f59e0b','#ec4899','#10b981','#f97316'];

// ── Starburst particles ───────────────────────────────────────────────
function makeParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle    = (i / PARTICLE_COUNT) * 360;
    const dist     = 55 + Math.random() * 45;
    const rad      = (angle * Math.PI) / 180;
    return {
      id:    Date.now() + i,
      px:    `${Math.cos(rad) * dist}px`,
      py:    `${Math.sin(rad) * dist}px`,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      size:  6 + Math.floor(Math.random() * 6),
    };
  });
}

// ── Category picker (ready screen) ───────────────────────────────────
const CategoryPicker = ({ enabled, onToggle }) => (
  <div className="grid grid-cols-2 gap-2">
    {Object.entries(CATEGORIES).map(([key, { label, icon }]) => {
      const on = enabled.includes(key);
      return (
        <button
          key={key}
          onClick={() => onToggle(key)}
          className={[
            'flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-bold transition-all',
            on
              ? 'bg-blue-600/25 border-blue-500/50 text-white'
              : 'bg-white/5 border-white/10 text-slate-400',
          ].join(' ')}
        >
          <span className="text-base w-5 text-center">{icon}</span>
          <span className="text-right flex-1 text-xs">{label}</span>
        </button>
      );
    })}
  </div>
);

// ── Analytics results screen ──────────────────────────────────────────
const ResultsScreen = ({ history, maxStreak, xpEarned, onReplay, onBack }) => {
  const { byCategory, weaknesses, strengths } = calculateAnalytics(history);
  const totalQ    = history.length;
  const totalOk   = history.filter(h => h.correct).length;
  const accuracy  = totalQ > 0 ? Math.round((totalOk / totalQ) * 100) : 0;

  const cats = Object.values(byCategory).sort((a, b) => b.avgMs - a.avgMs);
  const maxAvg = Math.max(...cats.map(c => c.avgMs), 1);

  return (
    <div className="w-full max-w-sm mx-auto px-4 pt-4 pb-10 space-y-4" dir="rtl">
      {/* Header */}
      <div className="text-center slide-in">
        <div className="text-4xl mb-2">📊</div>
        <h2 className="font-black text-2xl text-white">דוח ביצועים</h2>
        <p className="text-slate-400 text-sm mt-1">ניתוח מפגש ה-Survival Blitz שלך</p>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-3 gap-2 slide-in" style={{ animationDelay: '60ms' }}>
        {[
          { label: 'שאלות', value: totalQ,     icon: '📝' },
          { label: 'נכון',  value: `${accuracy}%`, icon: '✅' },
          { label: 'שיא',   value: maxStreak,  icon: '🔥' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center">
            <div className="text-lg">{icon}</div>
            <div className="font-black text-xl text-white mt-0.5">{value}</div>
            <div className="text-[10px] text-slate-400 font-bold">{label}</div>
          </div>
        ))}
      </div>

      {/* XP badge */}
      {xpEarned > 0 && (
        <div className="rounded-2xl bg-yellow-500/15 border border-yellow-500/30 p-3 flex items-center gap-3 slide-in" style={{ animationDelay: '120ms' }}>
          <Zap size={20} className="text-yellow-400 flex-shrink-0" />
          <span className="font-black text-yellow-300">+{xpEarned} XP הרווחת!</span>
        </div>
      )}

      {/* Strength / Weakness */}
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="space-y-2 slide-in" style={{ animationDelay: '160ms' }}>
          {strengths.length > 0 && (
            <div className="rounded-xl bg-green-600/15 border border-green-500/25 p-3">
              <p className="text-xs font-black text-green-400 mb-1">💪 חוזקות</p>
              {strengths.map(s => <p key={s} className="text-xs text-green-300">{s}</p>)}
            </div>
          )}
          {weaknesses.length > 0 && (
            <div className="rounded-xl bg-red-600/15 border border-red-500/25 p-3">
              <p className="text-xs font-black text-red-400 mb-1">⚠️ אזורים לשיפור</p>
              {weaknesses.map(w => <p key={w} className="text-xs text-red-300">{w}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Per-category time bars */}
      {cats.length > 0 && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3 slide-in" style={{ animationDelay: '200ms' }}>
          <p className="font-black text-sm text-white mb-2">⏱ זמן ממוצע לתגובה נכונה</p>
          {cats.map((c, i) => (
            <div key={c.label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-bold">{c.label}</span>
                <span className="text-slate-500">
                  {c.avgMs < 3000 ? `${(c.avgMs / 1000).toFixed(1)}ש׳` : '—'}
                  {' · '}
                  <span style={{ color: c.accuracy >= 0.9 ? '#4ade80' : c.accuracy >= 0.7 ? '#facc15' : '#f87171' }}>
                    {Math.round(c.accuracy * 100)}%
                  </span>
                </span>
              </div>
              <div className="h-2 bg-black/30 rounded-full overflow-hidden" dir="ltr">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${(c.avgMs / maxAvg) * 100}%`,
                    background: c.avgMs > 2000 ? '#ef4444' : c.avgMs > 1500 ? '#f59e0b' : '#22c55e',
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 slide-in" style={{ animationDelay: '280ms' }}>
        <button
          onClick={onReplay}
          className="flex-1 py-4 rounded-2xl font-black text-white bg-gradient-to-br from-blue-600 to-indigo-700 active:scale-95 transition"
        >
          שחק שוב
        </button>
        <button
          onClick={onBack}
          className="px-5 py-4 rounded-2xl font-bold text-slate-300 bg-white/5 border border-white/10 active:scale-95 transition"
        >
          יציאה
        </button>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────
const MathSurvival = () => {
  const navigate = useNavigate();
  const { awardXP, currentSubject, updateHighCombo } = useVocab();

  // Guard: only playable in math subject
  if (currentSubject !== SUBJECTS.MATH) {
    navigate('/hub', { replace: true });
    return null;
  }

  // ── Screen state ────────────────────────────────────────────────────
  const [screen, setScreen] = useState('ready'); // ready | playing | gameover | results

  // ── Category picker ──────────────────────────────────────────────────
  const [enabledTypes, setEnabledTypes] = useState(Object.keys(CATEGORIES));
  const toggleType = (key) =>
    setEnabledTypes(prev =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter(k => k !== key) : prev  // keep at least 1
        : [...prev, key]
    );

  // ── Game state ───────────────────────────────────────────────────────
  const [question,    setQuestion]    = useState(null);
  const [input,       setInput]       = useState('');
  const [streak,      setStreak]      = useState(0);
  const [maxStreak,   setMaxStreak]   = useState(0);
  const [timeLeft,    setTimeLeft]    = useState(TIME_LIMIT_MS);
  const [history,     setHistory]     = useState([]);
  const [xpEarned,    setXpEarned]    = useState(0);
  const [questionKey, setQuestionKey] = useState(0);   // forces CSS timer reset

  // ── Visual effects ───────────────────────────────────────────────────
  const [particles,     setParticles]     = useState([]);
  const [shaking,       setShaking]       = useState(false);
  const [showMathText,  setShowMathText]  = useState(false);
  const [wrongFlash,    setWrongFlash]    = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────
  const startTimeRef  = useRef(null);   // Date.now() when question was shown
  const timerRef      = useRef(null);   // setInterval ID
  const streakRef     = useRef(0);      // always-fresh streak mirror

  // ── Timer logic ──────────────────────────────────────────────────────
  const stopTimer = () => { clearInterval(timerRef.current); };

  const startTimer = () => {
    stopTimer();
    setTimeLeft(TIME_LIMIT_MS);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - TICK_MS;
        if (next <= 0) {
          stopTimer();
          handleTimeout();
          return 0;
        }
        return next;
      });
    }, TICK_MS);
  };

  // ── Effects cleanup ───────────────────────────────────────────────────
  useEffect(() => () => stopTimer(), []);  // eslint-disable-line

  // ── Question management ───────────────────────────────────────────────
  const pushQuestion = useCallback(() => {
    const q = generateQuestion(enabledTypes);
    setQuestion(q);
    setInput('');
    setQuestionKey(k => k + 1);
    startTimer();
  }, [enabledTypes]); // eslint-disable-line

  // ── Start game ────────────────────────────────────────────────────────
  const startGame = () => {
    setStreak(0);
    setMaxStreak(0);
    setHistory([]);
    setXpEarned(0);
    streakRef.current = 0;
    setScreen('playing');
    // Push first question on next frame so screen has mounted
    setTimeout(pushQuestion, 0);
  };

  // ── Handle timeout (time ran out) ─────────────────────────────────────
  const handleTimeout = useCallback(() => {
    setHistory(prev => {
      const entry = { ...question, timeMs: TIME_LIMIT_MS, correct: false };
      return [...prev, entry];
    });
    endGame();
  }, [question]); // eslint-disable-line

  // ── End game + XP ────────────────────────────────────────────────────
  const endGame = useCallback(() => {
    stopTimer();
    const earned = Math.max(streakRef.current * 3, 0);
    setXpEarned(earned);
    if (earned > 0) awardXP(earned);
    updateHighCombo(streakRef.current);
    setScreen('gameover');
    // brief pause then jump to results
    setTimeout(() => setScreen('results'), 1800);
  }, []); // eslint-disable-line

  // ── Handle correct answer ─────────────────────────────────────────────
  const handleCorrect = useCallback((q, timeMs) => {
    const newStreak = streakRef.current + 1;
    streakRef.current = newStreak;
    setStreak(newStreak);
    setMaxStreak(m => Math.max(m, newStreak));

    // Milestone: every 5 correct
    if (newStreak % STREAK_MILESTONE === 0) {
      setShaking(true);
      setShowMathText(true);
      setTimeout(() => { setShaking(false); setShowMathText(false); }, 1600);
    }
    // StarBurst for hard squares (11-20)
    if (q.isHardSquare) {
      setParticles(makeParticles());
      setTimeout(() => setParticles([]), 750);
    }

    setHistory(prev => [...prev, { ...q, timeMs, correct: true }]);
    pushQuestion();
  }, [pushQuestion]);

  // ── Submit answer ─────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (!question || !input || screen !== 'playing') return;
    const timeMs  = Date.now() - (startTimeRef.current ?? Date.now());
    const userAns = parseInt(input, 10);

    if (userAns === question.answer) {
      handleCorrect(question, timeMs);
    } else {
      // Wrong answer → game over
      stopTimer();
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 400);
      setHistory(prev => [...prev, { ...question, timeMs, correct: false }]);
      endGame();
    }
  }, [question, input, screen, handleCorrect, endGame]);

  // ── Timer bar color transitions red as time runs low ─────────────────
  const timerPct   = timeLeft / TIME_LIMIT_MS;
  const timerColor = timerPct > 0.5 ? '#22c55e' : timerPct > 0.25 ? '#f59e0b' : '#ef4444';

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────

  // ── Ready screen ───────────────────────────────────────────────────
  if (screen === 'ready') {
    return (
      <div className="w-full max-w-sm mx-auto px-4 pt-6 pb-10 space-y-5" dir="rtl">
        <SurvivalStyles />
        {/* Back */}
        <button
          onClick={() => navigate('/math')}
          className="flex items-center gap-1.5 text-slate-400 text-sm hover:text-white transition"
        >
          <ArrowRight size={16} className="rotate-180" /> חזרה
        </button>

        {/* Title */}
        <div className="text-center">
          <div className="text-5xl mb-3">⚡</div>
          <h1 className="font-black text-3xl text-white leading-tight">Survival Blitz</h1>
          <p className="text-slate-400 text-sm mt-2">
            3 שניות לשאלה · טעות אחת = Game Over
          </p>
        </div>

        {/* Category picker */}
        <div>
          <p className="text-xs font-black text-slate-400 mb-2 uppercase tracking-wider">בחר קטגוריות</p>
          <CategoryPicker enabled={enabledTypes} onToggle={toggleType} />
        </div>

        {/* Rules */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2 text-xs text-slate-400">
          {[
            { icon: <Clock size={13}/>, text: '3 שניות לכל שאלה — הקלד ולחץ ✓' },
            { icon: <Flame size={13} className="text-orange-400"/>, text: 'שמור על רצף — כל 5 נכון = MATHEMATICIAN!' },
            { icon: <Trophy size={13} className="text-yellow-400"/>, text: `XP = שיא × 3` },
          ].map(({ icon, text }, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0">{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Start */}
        <button
          onClick={startGame}
          className="w-full py-5 rounded-2xl font-black text-xl text-white bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-900/40 active:scale-95 transition"
        >
          התחל ⚡
        </button>
      </div>
    );
  }

  // ── Game Over ───────────────────────────────────────────────────────
  if (screen === 'gameover') {
    return (
      <div className="w-full max-w-sm mx-auto px-4 pt-16 text-center" dir="rtl">
        <SurvivalStyles />
        <div className="text-6xl mb-4">💥</div>
        <h2 className="font-black text-4xl text-red-400 mb-2">GAME OVER</h2>
        <p className="text-slate-400">
          הגעת לרצף של <span className="font-black text-white">{maxStreak}</span> תשובות נכונות
        </p>
        {xpEarned > 0 && (
          <p className="mt-3 text-yellow-400 font-bold">+{xpEarned} XP הרווחת</p>
        )}
      </div>
    );
  }

  // ── Results ─────────────────────────────────────────────────────────
  if (screen === 'results') {
    return (
      <>
        <SurvivalStyles />
        <ResultsScreen
          history={history}
          maxStreak={maxStreak}
          xpEarned={xpEarned}
          onReplay={startGame}
          onBack={() => navigate('/math')}
        />
      </>
    );
  }

  // ── Playing screen ──────────────────────────────────────────────────
  return (
    <div
      className={`relative w-full max-w-sm mx-auto flex flex-col select-none overflow-hidden ${shaking ? 'screen-shake' : ''} ${wrongFlash ? 'wrong-flash' : ''}`}
      dir="rtl"
    >
      <SurvivalStyles />

      {/* StarBurst particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="math-particle pointer-events-none fixed top-1/2 left-1/2 rounded-full z-50"
          style={{
            width: p.size,
            height: p.size,
            background: p.color,
            '--px': p.px,
            '--py': p.py,
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
          }}
        />
      ))}

      {/* MATHEMATICIAN! overlay */}
      {showMathText && (
        <div className="math-burst fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div
            className="font-black text-4xl text-center px-6 py-3 rounded-2xl"
            style={{
              color: '#facc15',
              textShadow: '0 0 20px #facc15, 0 0 40px #f59e0b, 0 0 80px #f97316',
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
            }}
          >
            MATHEMATICIAN!
          </div>
        </div>
      )}

      {/* ── Top bar: streak + close ────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <Flame size={18} className={streak > 0 ? 'text-orange-400' : 'text-slate-600'} />
          <span className={`font-black text-xl ${streak > 0 ? 'text-white' : 'text-slate-500'}`}>
            {streak}
          </span>
          <span className="text-xs text-slate-500 font-bold">רצף</span>
        </div>
        <button
          onClick={() => { stopTimer(); navigate('/math'); }}
          className="text-slate-500 hover:text-slate-300 text-xs font-bold px-2 py-1 rounded-lg transition"
        >
          יציאה
        </button>
      </div>

      {/* ── Timer bar ─────────────────────────────────────────────── */}
      <div className="mx-4 h-3 bg-black/30 rounded-full overflow-hidden mb-4" dir="ltr">
        <div
          key={questionKey}       /* reset CSS animation on each new question */
          className="timer-bar h-full rounded-full"
          style={{
            animationDuration: `${TIME_LIMIT_MS}ms`,
            backgroundColor: timerColor,
          }}
        />
      </div>

      {/* ── Question display ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-2 relative min-h-[180px]">
        {question && (
          <div key={questionKey} className="q-pop text-center">
            {/* Category badge */}
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
              {question.type === 'square' ? 'ריבועים' :
               question.type === 'root'   ? 'שורשים'  :
               question.type === 'addition' ? 'חיבור'  :
               question.type === 'subtraction' ? 'השלמה ל-100' :
               question.type === 'multiplication' ? 'כפל' : 'חילוק'}
            </span>
            {/* Question text */}
            <div
              className="font-black text-white leading-none"
              style={{ fontSize: 'clamp(3rem, 15vw, 5rem)' }}
            >
              {question.display}
            </div>
            <div className="text-slate-400 font-black text-3xl mt-1">= ?</div>
          </div>
        )}
      </div>

      {/* ── Input display ─────────────────────────────────────────── */}
      <div className="mx-4 mb-4">
        <div
          className="w-full h-14 rounded-2xl bg-white/8 border border-white/15 flex items-center justify-center gap-1"
          dir="ltr"
        >
          <span className="font-black text-3xl text-white tracking-widest">
            {input || ''}
          </span>
          {input.length < 5 && (
            <span className="cursor font-black text-3xl text-blue-400">|</span>
          )}
        </div>
      </div>

      {/* ── Custom numpad ─────────────────────────────────────────── */}
      <div className="px-4 pb-6">
        <MathNumpad
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={screen !== 'playing'}
        />
      </div>
    </div>
  );
};

export default MathSurvival;

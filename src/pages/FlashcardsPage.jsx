import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2, XCircle, RotateCcw, Zap, Layers, Loader2 } from 'lucide-react';
import { useVocab, WORD_STATUS } from '../context/VocabContext';
import rawData from '../data/academicDB.json';

// ==========================================
// FlashcardsPage — Tinder-style vocab swipe
//
// Swipe right / tap ✓  → mark as "known"
// Swipe left  / tap ✗  → mark as "unknown"
// Tap card (no drag)   → reveal Hebrew translation
//
// Session: up to 20 non-known words, ordered by:
//   unknown → uncertain → unrated
// XP: +5 every 10 swipes
// ==========================================

const SESSION_SIZE    = 20;
const SWIPE_THRESHOLD = 80;    // px needed to trigger a decision
const FLY_DURATION_MS = 320;

const ALL_WORDS = [...rawData].sort((a, b) => a.word.localeCompare(b.word));

// ── Card stack visual ─────────────────────────────────────────────────
const STACK_OFFSETS = [
  { y: 0,  scale: 1,    opacity: 1    },  // top card
  { y: 10, scale: 0.96, opacity: 0.85 },  // card behind
  { y: 20, scale: 0.92, opacity: 0.65 },  // card further behind
];

// ── Summary screen ────────────────────────────────────────────────────
const Summary = ({ known, unknown, total, onRestart }) => (
  <div className="w-full max-w-sm mx-auto px-4 pt-12 flex flex-col items-center gap-6 text-center">
    <div className="w-20 h-20 rounded-3xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
      <Zap size={36} className="text-yellow-400" />
    </div>
    <div>
      <h2 className="font-black text-2xl text-white">כל הכבוד!</h2>
      <p className="text-slate-400 text-sm mt-1">סיימת את כל הכרטיסיות בסשן הזה</p>
    </div>

    <div className="w-full grid grid-cols-2 gap-3">
      <div className="bg-green-900/20 border border-green-800/30 rounded-2xl p-4">
        <div className="font-black text-3xl text-green-400">{known}</div>
        <div className="text-slate-400 text-sm mt-1">ידוע ✓</div>
      </div>
      <div className="bg-red-900/20 border border-red-800/30 rounded-2xl p-4">
        <div className="font-black text-3xl text-red-400">{unknown}</div>
        <div className="text-slate-400 text-sm mt-1">לא ידוע ✗</div>
      </div>
    </div>

    <div className="text-slate-500 text-sm">
      סה"כ {total} כרטיסיות בסשן זה
    </div>

    <button
      onClick={onRestart}
      className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition active:scale-95"
    >
      <RotateCcw size={20} /> סשן חדש
    </button>
  </div>
);

// ── Main component ────────────────────────────────────────────────────
const FlashcardsPage = () => {
  const location = useLocation();
  const { wordStatuses, setWordStatus, awardXP, supabaseUser, vocabSyncing } = useVocab();

  const [sessionWords, setSessionWords] = useState([]);
  const [currentIdx, setCurrentIdx]     = useState(0);
  const [flipped, setFlipped]           = useState(false);    // show translation?
  const [dragX, setDragX]               = useState(0);
  const [isFlyingOff, setIsFlyingOff]   = useState(null);    // 'left' | 'right' | null
  const [isDragging, setIsDragging]     = useState(false);
  const [results, setResults]           = useState({ known: 0, unknown: 0 });
  const [swiped, setSwiped]             = useState(0);
  const [done, setDone]                 = useState(false);

  const dragStartX     = useRef(0);
  const dragStartY     = useRef(0);
  const prevClientX    = useRef(0);      // previous frame x — used to accumulate path length
  const totalPathRef   = useRef(0);      // accumulated gesture path (not net displacement)
  const dragXRef       = useRef(0);      // net X displacement — mirror of dragX state
  const isDraggingRef  = useRef(false);  // mirror of isDragging — used in window handlers
  const activePtrId    = useRef(null);   // pointerId that owns the current drag (blocks second finger)
  const decideRef      = useRef(null);   // always points to latest decide — read in window onPointerUp
  const xpMilestoneRef = useRef(0);      // avoids stale closure in decide's setSwiped
  const flyTimeoutRef  = useRef(null);   // track fly-off timeout so we can cancel on session reset
  const cardRef        = useRef(null);
  const prevSyncing    = useRef(false);

  // ── Build session ─────────────────────────────────────────────────
  const buildSession = useCallback(() => {
    const unknown   = ALL_WORDS.filter(w => wordStatuses[w.word.toLowerCase()] === WORD_STATUS.UNKNOWN);
    const uncertain = ALL_WORDS.filter(w => wordStatuses[w.word.toLowerCase()] === WORD_STATUS.UNCERTAIN);
    const unrated   = ALL_WORDS.filter(w => !wordStatuses[w.word.toLowerCase()]);

    const pool = [
      ...unknown.sort(() => 0.5 - Math.random()),
      ...uncertain.sort(() => 0.5 - Math.random()),
      ...unrated.sort(() => 0.5 - Math.random()),
    ].slice(0, SESSION_SIZE);

    // If pool is empty (everything is known), allow a review of all words
    if (pool.length === 0) {
      return ALL_WORDS.sort(() => 0.5 - Math.random()).slice(0, SESSION_SIZE);
    }
    return pool;
  }, [wordStatuses]);

  const startSession = useCallback(() => {
    clearTimeout(flyTimeoutRef.current);
    isDraggingRef.current = false;   // cancel any in-progress drag
    activePtrId.current   = null;
    dragXRef.current      = 0;
    totalPathRef.current  = 0;
    setSessionWords(buildSession());
    setCurrentIdx(0);
    setFlipped(false);
    setDragX(0);
    setIsDragging(false);
    setIsFlyingOff(null);
    setResults({ known: 0, unknown: 0 });
    setSwiped(0);
    xpMilestoneRef.current = 0;
    setDone(false);
  }, [buildSession]);

  // Init on mount + re-tap
  useEffect(() => { startSession(); }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cancel pending fly-off timeout on unmount
  useEffect(() => () => clearTimeout(flyTimeoutRef.current), []);

  // Rebuild session when Supabase vocab sync completes (true → false)
  useEffect(() => {
    if (prevSyncing.current && !vocabSyncing && swiped === 0) {
      startSession();
    }
    prevSyncing.current = vocabSyncing;
  }, [vocabSyncing]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Decision (swipe outcome) ──────────────────────────────────────
  const decide = useCallback((direction) => {
    if (isFlyingOff) return;
    const word = sessionWords[currentIdx];
    if (!word) return;

    // Capture index + length NOW so the setTimeout closure is never stale
    const capturedIdx   = currentIdx;
    const capturedTotal = sessionWords.length;
    const status        = direction === 'right' ? WORD_STATUS.KNOWN : WORD_STATUS.UNKNOWN;

    setIsFlyingOff(direction);
    setWordStatus(word.word, status);

    // Functional setState — no stale closure on results
    setResults(prev => direction === 'right'
      ? { ...prev, known: prev.known + 1 }
      : { ...prev, unknown: prev.unknown + 1 });

    // Functional setState — no stale closure on swiped; xpMilestoneRef is always fresh
    setSwiped(prev => {
      const next      = prev + 1;
      const milestone = Math.floor(next / 10);
      if (milestone > xpMilestoneRef.current) {
        xpMilestoneRef.current = milestone;
        awardXP(5);
      }
      return next;
    });

    flyTimeoutRef.current = setTimeout(() => {
      setIsFlyingOff(null);
      setDragX(0);
      setFlipped(false);
      if (capturedIdx + 1 >= capturedTotal) {
        setDone(true);
      } else {
        setCurrentIdx(capturedIdx + 1);
      }
    }, FLY_DURATION_MS);
  }, [isFlyingOff, sessionWords, currentIdx, setWordStatus, awardXP]);

  // Keep decideRef pointing to the latest decide so window handlers never go stale
  useEffect(() => { decideRef.current = decide; }, [decide]);

  // ── Pointer events ────────────────────────────────────────────────
  // Only pointerdown is on the card; move/up/cancel are on the window so they
  // always fire regardless of where the pointer goes (browser window, outside
  // the card, etc.). This is the industry-standard drag pattern and eliminates
  // every stuck-card scenario.
  const onPointerDown = useCallback((e) => {
    if (isFlyingOff) return;           // block new drag during fly-off animation
    if (isDraggingRef.current) return;  // block second finger starting a drag
    activePtrId.current   = e.pointerId;
    dragStartX.current    = e.clientX;
    dragStartY.current    = e.clientY;
    prevClientX.current   = e.clientX;
    totalPathRef.current  = 0;
    dragXRef.current      = 0;
    isDraggingRef.current = true;
    setDragX(0);
    setIsDragging(true);
  }, [isFlyingOff]);

  // Window-level move / up / cancel — registered once, all refs (no stale closures)
  useEffect(() => {
    const resetDrag = () => {
      isDraggingRef.current = false;
      activePtrId.current   = null;
      dragXRef.current      = 0;
      totalPathRef.current  = 0;
      setIsDragging(false);
      setDragX(0);
    };

    const onMove = (e) => {
      if (!isDraggingRef.current) return;
      if (e.pointerId !== activePtrId.current) return;  // ignore other fingers
      const dx = e.clientX - dragStartX.current;
      const dy = e.clientY - dragStartY.current;
      totalPathRef.current += Math.abs(e.clientX - prevClientX.current);
      prevClientX.current   = e.clientX;
      // Vertical scroll rejection: first 20px — if gesture is primarily vertical, cancel
      if (totalPathRef.current < 20 && Math.abs(dy) > Math.abs(dx) * 1.5) {
        resetDrag(); return;
      }
      dragXRef.current = dx;
      setDragX(dx);
    };

    const onUp = (e) => {
      if (!isDraggingRef.current) return;
      if (e.pointerId !== activePtrId.current) return;
      const finalDx   = dragXRef.current;
      const totalPath = totalPathRef.current;
      resetDrag();
      if (totalPath < 6) {
        setFlipped(f => !f);                   // tap → flip card
      } else if (finalDx > SWIPE_THRESHOLD) {
        decideRef.current?.('right');
      } else if (finalDx < -SWIPE_THRESHOLD) {
        decideRef.current?.('left');
      }
      // else: snap back (setDragX(0) already called by resetDrag)
    };

    const onCancel = (e) => {
      if (e && e.pointerId !== activePtrId.current) return;
      resetDrag();
    };

    window.addEventListener('pointermove',   onMove);
    window.addEventListener('pointerup',     onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove',   onMove);
      window.removeEventListener('pointerup',     onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, []);

  // ── Render guards ─────────────────────────────────────────────────
  if (vocabSyncing && swiped === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] px-6 text-center gap-4">
        <Loader2 size={40} className="text-blue-400 animate-spin" />
        <p className="text-slate-400 font-bold">מסנכרן מילים...</p>
      </div>
    );
  }

  if (done) {
    return (
      <Summary
        known={results.known}
        unknown={results.unknown}
        total={swiped}
        onRestart={startSession}
      />
    );
  }

  if (!sessionWords.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] px-6 text-center gap-4">
        <Layers size={48} className="text-blue-400 opacity-40" />
        <p className="text-slate-400 font-bold">טוען כרטיסיות...</p>
      </div>
    );
  }

  const progress    = swiped / sessionWords.length;
  const currentWord = sessionWords[currentIdx];
  if (!currentWord) return null; // safety: index somehow out of bounds

  // Decision hint color based on drag
  const hintRight = dragX > 30;
  const hintLeft  = dragX < -30;

  return (
    <div className="w-full max-w-sm mx-auto px-4 pt-4 pb-4 flex flex-col gap-5 select-none">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-slate-500 text-sm font-bold">{swiped} / {sessionWords.length}</div>
        {supabaseUser && (
          <div className="flex items-center gap-1 text-yellow-400/70 text-xs font-bold">
            <Zap size={12} /> +5 XP כל 10 כרטיסיות
          </div>
        )}
        <div className="text-slate-500 text-sm font-bold">
          ✓ {results.known} · ✗ {results.unknown}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Card stack */}
      <div className="relative h-72 flex items-center justify-center" style={{ touchAction: 'none', userSelect: 'none' }}>
        {/* Background stack cards (purely decorative) */}
        {[2, 1].map(offset => {
          const s = STACK_OFFSETS[offset];
          const stackWord = sessionWords[currentIdx + offset];
          if (!stackWord) return null;
          return (
            <div
              key={sessionWords[currentIdx + offset]?.word ?? offset}
              className="absolute inset-x-0 bg-slate-800 border border-slate-700 rounded-3xl h-72"
              style={{
                transform:  `translateY(${s.y}px) scale(${s.scale})`,
                opacity:    s.opacity,
                zIndex:     3 - offset,
              }}
            />
          );
        })}

        {/* Top (active) card */}
        <div
          ref={cardRef}
          onPointerDown={onPointerDown}
          className="absolute inset-x-0 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl h-72 flex flex-col items-center justify-center gap-4 px-6 cursor-grab active:cursor-grabbing overflow-hidden"
          style={{
            zIndex:      4,
            touchAction: 'none',   // must be on the card itself, not just the container
            transform:   isFlyingOff
              ? `translateX(${isFlyingOff === 'right' ? 'calc(100vw + 100%)' : 'calc(-100vw - 100%)'}) rotate(${isFlyingOff === 'right' ? '25deg' : '-25deg'})`
              : `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`,
            transition:  isFlyingOff
              ? `transform ${FLY_DURATION_MS}ms cubic-bezier(0.4,0,1,1)`
              : isDragging ? 'none' : 'transform 0.25s ease',
          }}
        >
          {/* Direction hint overlays */}
          <div
            className="absolute inset-0 bg-green-500/15 rounded-3xl flex items-center justify-center transition-opacity"
            style={{ opacity: hintRight ? Math.min((dragX - 30) / 80, 1) : 0 }}
          >
            <span className="text-green-400 font-black text-5xl border-4 border-green-400 rounded-2xl px-4 py-1 rotate-[-15deg]">ידוע</span>
          </div>
          <div
            className="absolute inset-0 bg-red-500/15 rounded-3xl flex items-center justify-center transition-opacity"
            style={{ opacity: hintLeft ? Math.min((-dragX - 30) / 80, 1) : 0 }}
          >
            <span className="text-red-400 font-black text-5xl border-4 border-red-400 rounded-2xl px-4 py-1 rotate-[15deg]">לא ידוע</span>
          </div>

          {/* Card content */}
          <div className="text-center pointer-events-none z-10">
            <p dir="ltr" className="font-black text-4xl text-white leading-tight break-all">
              {currentWord.word}
            </p>
            {currentWord.pos && (
              <span className="text-xs text-slate-500 font-bold mt-1 block">
                {currentWord.pos}
              </span>
            )}
          </div>

          {flipped ? (
            <div className="text-center z-10 pointer-events-none">
              <p className="text-blue-300 text-xl font-black">{currentWord.translation}</p>
              <p className="text-slate-500 text-xs mt-2">החלק ימינה אם ידוע · שמאלה אם לא</p>
            </div>
          ) : (
            <p className="text-slate-600 text-sm z-10 pointer-events-none">הקש לראות תרגום</p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4 items-center justify-center pt-1">
        <button
          onClick={() => decide('left')}
          disabled={!!isFlyingOff}
          className="flex-1 py-4 bg-red-900/30 hover:bg-red-900/50 border-2 border-red-700/40 hover:border-red-600/60 disabled:opacity-30 rounded-2xl flex items-center justify-center gap-2 font-black text-red-400 transition active:scale-95"
        >
          <XCircle size={22} /> לא ידוע
        </button>
        <button
          onClick={() => setFlipped(f => !f)}
          disabled={!!isFlyingOff}
          className="w-14 h-14 bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-30 rounded-2xl flex items-center justify-center text-slate-400 transition active:scale-95 flex-shrink-0"
          title="הצג תרגום"
        >
          <RotateCcw size={18} />
        </button>
        <button
          onClick={() => decide('right')}
          disabled={!!isFlyingOff}
          className="flex-1 py-4 bg-green-900/30 hover:bg-green-900/50 border-2 border-green-700/40 hover:border-green-600/60 disabled:opacity-30 rounded-2xl flex items-center justify-center gap-2 font-black text-green-400 transition active:scale-95"
        >
          <CheckCircle2 size={22} /> ידוע
        </button>
      </div>

      {/* Legend */}
      <p className="text-center text-slate-600 text-xs">
        החלק שמאלה ✗ · הקש לתרגום · החלק ימינה ✓
      </p>
    </div>
  );
};

export default FlashcardsPage;

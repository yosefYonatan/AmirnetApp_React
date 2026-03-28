import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2, XCircle, RotateCcw, Zap, Layers, Loader2, ChevronRight } from 'lucide-react';
import { useVocab, WORD_STATUS } from '../context/VocabContext';
import {
  FOLDER_META, PROGRESS_THRESHOLD,
  getFolderWords, getFolderMastery, isFolderUnlocked,
  getShowContext, getWordContext,
} from '../utils/folderSystem';

// ==========================================
// FlashcardsPage — 14-folder difficulty system
//
// Screen 1 (selectedFolder===null): Folder picker grid
// Screen 2 (selectedFolder set):    Tinder-style SRS session
//
// Swipe right / ✓  → mark as "known"
// Swipe left  / ✗  → mark as "unknown"
// Tap card         → reveal Hebrew translation
//
// Session: up to 20 non-known words from the selected folder
// XP: +5 per 10 swipes × folder xpMultiplier (×1.5 for folders 11-14)
// ==========================================

const SESSION_SIZE    = 20;
const SWIPE_THRESHOLD = 80;
const FLY_DURATION_MS = 320;

const TIER_LABELS = { basic: 'בסיסי', advanced: 'אקדמי', expert: 'מומחה' };
const TIER_ICONS  = { basic: '📗', advanced: '📙', expert: '📕' };

// ── CSS animations ────────────────────────────────────────────────────
const FlashcardStyles = () => (
  <style>{`
    /* Folder card stagger-enter */
    @keyframes folder-card-enter {
      from { opacity: 0; transform: translateY(16px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }
    .folder-enter { animation: folder-card-enter 0.28s ease both; }

    /* Click: scale-up + glow, then fade to session */
    @keyframes folder-unlock {
      0%   { transform: scale(1);    }
      40%  { transform: scale(1.07); box-shadow: 0 0 30px var(--fc, #fff); }
      70%  { transform: scale(0.98); }
      100% { transform: scale(1.04); opacity: 0.55; }
    }
    .folder-unlocking { animation: folder-unlock 0.38s ease forwards; }

    /* Golden glow for mastered folders */
    .folder-mastered {
      box-shadow: 0 0 0 2px #f59e0b, 0 0 18px #f59e0b66 !important;
    }

    /* Shake on locked click */
    @keyframes folder-shake {
      0%,100% { transform: translateX(0); }
      20%     { transform: translateX(-7px); }
      40%     { transform: translateX(7px); }
      60%     { transform: translateX(-5px); }
      80%     { transform: translateX(4px); }
    }
    .folder-shake { animation: folder-shake 0.32s ease; }

    /* Newly-unlocked glow on picker return */
    @keyframes folder-new-unlock {
      0%,100% { box-shadow: 0 0 0 2px var(--fc,#22c55e), 0 0 8px  var(--fc,#22c55e); }
      50%     { box-shadow: 0 0 0 3px var(--fc,#22c55e), 0 0 36px var(--fc,#22c55e); }
    }
    .folder-new-unlock { animation: folder-new-unlock 1.2s ease 3; }

    /* Unlock celebration banner */
    @keyframes unlock-banner-in {
      0%   { opacity: 0; transform: translateX(-50%) translateY(-18px) scale(0.88); }
      18%  { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1.04); }
      80%  { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1);   }
      100% { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(0.92); }
    }
    .unlock-banner { animation: unlock-banner-in 3.2s ease forwards; }

    /* Context popover spring entrance / exit */
    @keyframes ctx-popover-in {
      0%   { opacity: 0; transform: scale(0.88) translateY(14px); }
      55%  { opacity: 1; transform: scale(1.03) translateY(-2px); }
      100% { opacity: 1; transform: scale(1)    translateY(0);    }
    }
    @keyframes ctx-popover-out {
      0%   { opacity: 1; transform: scale(1)    translateY(0); }
      100% { opacity: 0; transform: scale(0.92) translateY(8px); }
    }
    .ctx-popover-in  { animation: ctx-popover-in  0.38s cubic-bezier(0.34,1.56,0.64,1) forwards; }
    .ctx-popover-out { animation: ctx-popover-out 0.22s ease forwards; }

    /* Neon pulse for show-matched words */
    @keyframes show-neon-pulse {
      0%,100% { box-shadow: 0 0 4px var(--neon,#a855f7), 0 0 8px  var(--neon,#a855f7); }
      50%     { box-shadow: 0 0 12px var(--neon,#a855f7), 0 0 24px var(--neon,#a855f7); }
    }
    .neon-pulse { animation: show-neon-pulse 1.8s ease infinite; }
  `}</style>
);

// ── Card stack visual ─────────────────────────────────────────────────
const STACK_OFFSETS = [
  { y: 0,  scale: 1,    opacity: 1    },
  { y: 10, scale: 0.96, opacity: 0.85 },
  { y: 20, scale: 0.92, opacity: 0.65 },
];

// ── Summary screen ────────────────────────────────────────────────────
const Summary = ({ known, unknown, total, folderMeta, onRestart, onBack }) => (
  <div className="w-full max-w-sm mx-auto px-4 pt-12 flex flex-col items-center gap-6 text-center">
    <div className="w-20 h-20 rounded-3xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
      <Zap size={36} className="text-yellow-400" />
    </div>
    <div>
      <h2 className="font-black text-2xl text-white">כל הכבוד!</h2>
      <p className="text-slate-400 text-sm mt-1">
        סיימת את כל הכרטיסיות בתיקייה {folderMeta?.id} — {folderMeta?.heLabel}
      </p>
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

    <div className="text-slate-500 text-sm">סה"כ {total} כרטיסיות בסשן זה</div>

    <div className="w-full flex gap-3">
      <button
        onClick={onBack}
        className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 transition active:scale-95 text-slate-300"
      >
        <ChevronRight size={18} /> תיקיות
      </button>
      <button
        onClick={onRestart}
        className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition active:scale-95"
      >
        <RotateCcw size={20} /> סשן חדש
      </button>
    </div>
  </div>
);

// ── TV-show context popover ───────────────────────────────────────────
const ContextPopover = ({ ctx, onClose, isExiting }) => {
  if (!ctx) return null;
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Card */}
      <div
        className={`fixed inset-x-4 bottom-6 z-50 rounded-3xl overflow-hidden border border-white/10 shadow-2xl ${isExiting ? 'ctx-popover-out' : 'ctx-popover-in'}`}
        style={{ background: 'rgba(12,12,20,0.92)', backdropFilter: 'blur(24px)' }}
      >
        {/* Gradient header */}
        <div className={`bg-gradient-to-r ${ctx.gradient ?? 'from-slate-700 to-slate-900'} px-4 py-4 flex items-center gap-3`}>
          <span className="text-4xl leading-none">{ctx.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-black text-white text-lg leading-tight truncate">{ctx.showName}</p>
            {ctx.episodeLabel && (
              <p className="text-white/65 text-sm font-bold">{ctx.episodeLabel}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition text-2xl leading-none flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
          >
            ×
          </button>
        </div>

        {/* Episode summary */}
        {ctx.summary && (
          <div className="px-4 pt-4 pb-1">
            <p className="text-slate-300 text-sm leading-relaxed">{ctx.summary}</p>
          </div>
        )}

        {/* Show description */}
        {ctx.description && (
          <div className="px-4 py-3">
            <p className="text-slate-500 text-xs leading-relaxed">{ctx.description}</p>
          </div>
        )}

        {/* Close button */}
        <div className="px-4 pb-4 pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-slate-300 text-sm transition active:scale-95"
          >
            סגור
          </button>
        </div>
      </div>
    </>
  );
};

// ── Folder picker ─────────────────────────────────────────────────────
const FolderPicker = ({ wordStatuses, onSelect, newlyUnlockedId }) => {
  const [shakingId,    setShakingId]    = useState(null);
  const [lockedToast,  setLockedToast]  = useState(null); // folderId of locked folder tapped
  const [unlockingId,  setUnlockingId]  = useState(null); // folderId being animated before entry

  const handleCardClick = (meta) => {
    if (unlockingId) return;
    const unlocked = isFolderUnlocked(meta.id, wordStatuses);
    if (!unlocked) {
      setShakingId(meta.id);
      setLockedToast(meta.id);
      setTimeout(() => setShakingId(null),   360);
      setTimeout(() => setLockedToast(null), 2200);
      return;
    }
    setUnlockingId(meta.id);
    setTimeout(() => { setUnlockingId(null); onSelect(meta.id); }, 380);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 pt-4 pb-8 relative">
      <FlashcardStyles />

      {/* Locked-folder toast */}
      {lockedToast !== null && (
        <div className="fixed top-20 left-1/2 z-50 pointer-events-none unlock-banner
          bg-slate-900 border border-red-700/50 text-red-300 text-sm font-bold
          px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2"
          style={{ transform: 'translateX(-50%)' }}
        >
          🔒 שלוט בתיקייה {lockedToast - 1} כדי לפתוח רמה זו ({Math.round(PROGRESS_THRESHOLD * 100)}%)
        </div>
      )}

      {/* Header */}
      <div className="mb-5 text-center">
        <h2 className="font-black text-2xl text-white flex items-center justify-center gap-2">
          <Layers size={22} className="text-blue-400" /> כרטיסיות אנגלית
        </h2>
        <p className="text-slate-500 text-sm mt-1">14 תיקיות · בחר רמה להתחיל</p>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-2 gap-3">
        {FOLDER_META.map((meta, idx) => {
          const mastery  = getFolderMastery(meta.id, wordStatuses);
          const unlocked = isFolderUnlocked(meta.id, wordStatuses);
          const mastered = mastery >= 1.0;
          const pct      = Math.round(mastery * 100);
          const words    = getFolderWords(meta.id);
          const isNew    = meta.id === newlyUnlockedId;

          return (
            <button
              key={meta.id}
              onClick={() => handleCardClick(meta)}
              className={[
                'folder-enter relative rounded-2xl p-4 text-right border-2 transition-all active:scale-95 overflow-hidden',
                !unlocked ? 'opacity-50 grayscale' : 'hover:brightness-110',
                shakingId  === meta.id ? 'folder-shake'      : '',
                unlockingId === meta.id ? 'folder-unlocking' : '',
                mastered && unlocked ? 'folder-mastered'     : '',
                isNew && unlocked ? 'folder-new-unlock'      : '',
              ].join(' ')}
              style={{
                background:  `${meta.color}18`,
                borderColor: `${meta.color}${unlocked ? '77' : '33'}`,
                animationDelay: `${idx * 30}ms`,
                '--fc': meta.color,
              }}
            >
              {/* Lock overlay */}
              {!unlocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 rounded-2xl z-10">
                  <span className="text-3xl">🔒</span>
                </div>
              )}

              {/* Mastered badge */}
              {mastered && unlocked && (
                <span className="absolute top-2 left-2 text-[10px] font-black text-yellow-300 bg-yellow-400/20 border border-yellow-400/30 px-1.5 py-0.5 rounded-full">
                  ⭐ Mastered
                </span>
              )}

              {/* Expert XP bonus badge */}
              {meta.tier === 'expert' && unlocked && (
                <span className="absolute top-2 left-2 text-[9px] font-black text-purple-300 bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.5 rounded-full">
                  ⚡×1.5
                </span>
              )}

              {/* Folder number + tier icon */}
              <div className="flex items-start justify-between mb-2">
                <span
                  className="text-lg font-black rounded-xl px-2 py-0.5 leading-none"
                  style={{ background: meta.color, color: meta.tier === 'basic' ? '#000' : '#fff' }}
                >
                  {meta.id}
                </span>
                <span className="text-base">{TIER_ICONS[meta.tier]}</span>
              </div>

              {/* Labels */}
              <p className="font-black text-white text-sm leading-tight">{meta.heLabel}</p>
              <p className="text-slate-500 text-xs mt-0.5">{TIER_LABELS[meta.tier]} · {words.length} מילים</p>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: mastered ? '#f59e0b' : meta.color }}
                />
              </div>
              <p
                className="text-xs mt-1 font-bold"
                style={{ color: mastered ? '#f59e0b' : meta.color }}
              >
                {pct}%
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────
const FlashcardsPage = () => {
  const location = useLocation();
  const { wordStatuses, setWordStatus, awardXP, supabaseUser, vocabSyncing, selectedShow } = useVocab();

  // ── Screens ──────────────────────────────────────────────────────
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [newlyUnlockedId, setNewlyUnlockedId] = useState(null);  // triggers glow in picker

  // ── Session state ────────────────────────────────────────────────
  const [sessionWords, setSessionWords] = useState([]);
  const [currentIdx, setCurrentIdx]     = useState(0);
  const [flipped, setFlipped]           = useState(false);
  const [dragX, setDragX]               = useState(0);
  const [isFlyingOff, setIsFlyingOff]   = useState(null);
  const [isDragging, setIsDragging]     = useState(false);
  const [results, setResults]           = useState({ known: 0, unknown: 0 });
  const [swiped, setSwiped]             = useState(0);
  const [done, setDone]                 = useState(false);

  // ── Unlock banner (shown inside session) ─────────────────────────
  const [unlockBanner, setUnlockBanner] = useState(null); // folderId just unlocked

  // ── Context popover ───────────────────────────────────────────────
  const [contextOpen,    setContextOpen]    = useState(false);
  const [contextExiting, setContextExiting] = useState(false);
  const closeContext = useCallback(() => {
    setContextExiting(true);
    setTimeout(() => { setContextOpen(false); setContextExiting(false); }, 230);
  }, []);

  const dragStartX     = useRef(0);
  const dragStartY     = useRef(0);
  const prevClientX    = useRef(0);
  const totalPathRef   = useRef(0);
  const dragXRef       = useRef(0);
  const isDraggingRef  = useRef(false);
  const activePtrId    = useRef(null);
  const decideRef      = useRef(null);
  const xpMilestoneRef = useRef(0);
  const flyTimeoutRef  = useRef(null);
  const cardRef        = useRef(null);
  const prevSyncing    = useRef(false);
  const selectedFolderRef = useRef(null);
  // Track which folders were already unlocked to detect new unlocks
  const prevUnlockRef  = useRef({});

  // Keep selectedFolderRef in sync
  useEffect(() => { selectedFolderRef.current = selectedFolder; }, [selectedFolder]);

  // ── Detect new folder unlocks during session ──────────────────────
  useEffect(() => {
    if (!selectedFolder) return;
    const nextId = selectedFolder + 1;
    if (nextId > 14) return;
    const nowUnlocked = isFolderUnlocked(nextId, wordStatuses);
    if (nowUnlocked && !prevUnlockRef.current[nextId]) {
      prevUnlockRef.current[nextId] = true;
      setUnlockBanner(nextId);
      setNewlyUnlockedId(nextId);
      setTimeout(() => setUnlockBanner(null), 3200);
    }
  }, [wordStatuses, selectedFolder]);

  // ── Build session (folder-scoped) ─────────────────────────────────
  const buildSession = useCallback((folderId) => {
    const pool = getFolderWords(folderId);
    const unknown   = pool.filter(w => wordStatuses[w.word.toLowerCase()] === WORD_STATUS.UNKNOWN);
    const uncertain = pool.filter(w => wordStatuses[w.word.toLowerCase()] === WORD_STATUS.UNCERTAIN);
    const unrated   = pool.filter(w => !wordStatuses[w.word.toLowerCase()]);

    const ordered = [
      ...unknown.sort(() => 0.5 - Math.random()),
      ...uncertain.sort(() => 0.5 - Math.random()),
      ...unrated.sort(() => 0.5 - Math.random()),
    ].slice(0, SESSION_SIZE);

    if (ordered.length === 0) {
      return pool.sort(() => 0.5 - Math.random()).slice(0, SESSION_SIZE);
    }
    return ordered;
  }, [wordStatuses]);

  const startSession = useCallback((folderId) => {
    clearTimeout(flyTimeoutRef.current);
    isDraggingRef.current = false;
    activePtrId.current   = null;
    dragXRef.current      = 0;
    totalPathRef.current  = 0;
    setSessionWords(buildSession(folderId));
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

  // Reset to folder picker on re-tap of nav
  useEffect(() => {
    setSelectedFolder(null);
    setDone(false);
    setSessionWords([]);
    setNewlyUnlockedId(null);
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(flyTimeoutRef.current), []);

  // Rebuild session when Supabase vocab sync completes
  useEffect(() => {
    if (prevSyncing.current && !vocabSyncing && swiped === 0 && selectedFolderRef.current) {
      startSession(selectedFolderRef.current);
    }
    prevSyncing.current = vocabSyncing;
  }, [vocabSyncing]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Decision ────────────────────────────────────────────────────
  const decide = useCallback((direction) => {
    if (isFlyingOff) return;
    const word = sessionWords[currentIdx];
    if (!word) return;

    const capturedIdx   = currentIdx;
    const capturedTotal = sessionWords.length;
    const status        = direction === 'right' ? WORD_STATUS.KNOWN : WORD_STATUS.UNKNOWN;

    setIsFlyingOff(direction);
    setWordStatus(word.word, status);

    setResults(prev => direction === 'right'
      ? { ...prev, known: prev.known + 1 }
      : { ...prev, unknown: prev.unknown + 1 });

    setSwiped(prev => {
      const next      = prev + 1;
      const milestone = Math.floor(next / 10);
      if (milestone > xpMilestoneRef.current) {
        xpMilestoneRef.current = milestone;
        const meta = FOLDER_META.find(m => m.id === selectedFolderRef.current);
        awardXP(5, meta?.xpMultiplier ?? 1.0);
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

  useEffect(() => { decideRef.current = decide; }, [decide]);

  // ── Pointer events ────────────────────────────────────────────────
  const resetDrag = useCallback(() => {
    isDraggingRef.current = false;
    activePtrId.current   = null;
    dragXRef.current      = 0;
    totalPathRef.current  = 0;
    setIsDragging(false);
    setDragX(0);
  }, []);

  const onPointerDown = useCallback((e) => {
    if (isFlyingOff) return;
    if (isDraggingRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
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

  const onPointerMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    if (e.pointerId !== activePtrId.current) return;
    const dx = e.clientX - dragStartX.current;
    const dy = e.clientY - dragStartY.current;
    totalPathRef.current += Math.abs(e.clientX - prevClientX.current);
    prevClientX.current   = e.clientX;
    if (totalPathRef.current < 20 && Math.abs(dy) > Math.abs(dx) * 1.5) {
      resetDrag(); return;
    }
    dragXRef.current = dx;
    setDragX(dx);
  }, [resetDrag]);

  const onPointerUp = useCallback((e) => {
    if (!isDraggingRef.current) return;
    if (e.pointerId !== activePtrId.current) return;
    const finalDx   = dragXRef.current;
    const totalPath = totalPathRef.current;
    resetDrag();
    if (totalPath < 6) {
      setFlipped(f => !f);
    } else if (finalDx > SWIPE_THRESHOLD) {
      decideRef.current?.('right');
    } else if (finalDx < -SWIPE_THRESHOLD) {
      decideRef.current?.('left');
    }
  }, [resetDrag]);

  const onPointerCancel = useCallback(() => resetDrag(), [resetDrag]);

  // ── Handle folder selection ───────────────────────────────────────
  const handleFolderSelect = (folderId) => {
    setSelectedFolder(folderId);
    startSession(folderId);
  };

  const handleBackToFolders = () => {
    clearTimeout(flyTimeoutRef.current);
    setSelectedFolder(null);
    setDone(false);
    setSessionWords([]);
  };

  // ── Folder picker screen ─────────────────────────────────────────
  if (selectedFolder === null) {
    return (
      <FolderPicker
        wordStatuses={wordStatuses}
        onSelect={handleFolderSelect}
        newlyUnlockedId={newlyUnlockedId}
      />
    );
  }

  const folderMeta = FOLDER_META.find(m => m.id === selectedFolder);

  // ── Session screens ──────────────────────────────────────────────
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
        folderMeta={folderMeta}
        onRestart={() => startSession(selectedFolder)}
        onBack={handleBackToFolders}
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
  if (!currentWord) return null;

  const hintRight = dragX > 30;
  const hintLeft  = dragX < -30;

  // TV show context
  const showCtx    = getShowContext(currentWord.word);
  const wordContext = getWordContext(currentWord.word, selectedShow);

  return (
    <div className="w-full max-w-sm mx-auto px-4 pt-4 pb-4 flex flex-col gap-5 select-none">
      <FlashcardStyles />

      {/* Unlock celebration banner */}
      {unlockBanner && (
        <div
          className="unlock-banner fixed top-20 left-1/2 z-50 pointer-events-none
            bg-slate-900 border border-green-500/50 text-green-300 text-sm font-bold
            px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2"
          style={{ transform: 'translateX(-50%)' }}
        >
          🔓 תיקייה {unlockBanner} נפתחה! המשך כך!
        </div>
      )}

      {/* Header: back + folder info + XP hint */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={handleBackToFolders}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs font-bold transition active:scale-95 flex-shrink-0"
        >
          <ChevronRight size={15} /> תיקיות
        </button>

        <div className="flex-1 text-center">
          <span
            className="text-xs font-black px-2 py-0.5 rounded-full border"
            style={{
              color:       folderMeta?.color ?? '#fff',
              borderColor: `${folderMeta?.color ?? '#fff'}55`,
              background:  `${folderMeta?.color ?? '#fff'}15`,
            }}
          >
            {folderMeta?.id}. {folderMeta?.heLabel}
          </span>
        </div>

        <div className="flex items-center gap-1 text-yellow-400/70 text-xs font-bold flex-shrink-0">
          <Zap size={12} />
          {folderMeta?.tier === 'expert' ? '+7.5 XP' : '+5 XP'} /10
        </div>
      </div>

      {/* Progress counter */}
      <div className="flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">{swiped} / {sessionWords.length}</span>
        <span className="text-slate-500">✓ {results.known} · ✗ {results.unknown}</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress * 100}%`,
            background: folderMeta
              ? `linear-gradient(to right, ${folderMeta.color}cc, ${folderMeta.color})`
              : 'linear-gradient(to right, #3b82f6, #6366f1)',
          }}
        />
      </div>

      {/* Card stack */}
      <div className="relative h-72 flex items-center justify-center" style={{ touchAction: 'none', userSelect: 'none' }}>
        {[2, 1].map(offset => {
          const s = STACK_OFFSETS[offset];
          const stackWord = sessionWords[currentIdx + offset];
          if (!stackWord) return null;
          return (
            <div
              key={sessionWords[currentIdx + offset]?.word ?? offset}
              className="absolute inset-x-0 bg-slate-800 border border-slate-700 rounded-3xl h-72"
              style={{
                transform: `translateY(${s.y}px) scale(${s.scale})`,
                opacity:   s.opacity,
                zIndex:    3 - offset,
              }}
            />
          );
        })}

        {/* Active card */}
        <div
          key={currentIdx}
          ref={cardRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          className="absolute inset-x-0 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl h-72 flex flex-col items-center justify-center gap-4 px-6 cursor-grab active:cursor-grabbing overflow-hidden"
          style={{
            zIndex:      4,
            touchAction: 'none',
            transform:   isFlyingOff
              ? `translateX(${isFlyingOff === 'right' ? 'calc(100vw + 100%)' : 'calc(-100vw - 100%)'}) rotate(${isFlyingOff === 'right' ? '25deg' : '-25deg'})`
              : `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`,
            transition:  isFlyingOff
              ? `transform ${FLY_DURATION_MS}ms cubic-bezier(0.4,0,1,1)`
              : isDragging ? 'none' : 'transform 0.25s ease',
          }}
        >
          {/* Direction hints */}
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
              <span className="text-xs text-slate-500 font-bold mt-1 block">{currentWord.pos}</span>
            )}
            {/* TV show context button */}
            {wordContext && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setContextOpen(true); setContextExiting(false); }}
                className={[
                  'text-[11px] font-bold mt-2 px-3 py-1 rounded-full border',
                  'border-purple-500/40 bg-purple-500/15 text-purple-300',
                  'transition active:scale-95 pointer-events-auto',
                  folderMeta?.tier === 'expert' ? 'neon-pulse' : '',
                ].join(' ')}
                style={{ '--neon': '#a855f7' }}
              >
                {wordContext.emoji} ראה בהקשר
              </button>
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

      {/* Context popover */}
      {(contextOpen || contextExiting) && (
        <ContextPopover
          ctx={wordContext}
          onClose={closeContext}
          isExiting={contextExiting}
        />
      )}
    </div>
  );
};

export default FlashcardsPage;

import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { BrainCircuit, Sun, Moon, LogOut, User, LayoutGrid } from 'lucide-react';
import { VocabContextProvider, useVocab } from './context/VocabContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import NavBar from './components/NavBar';
import AuthModal from './components/AuthModal';
import LevelUpOverlay from './components/LevelUpOverlay';
import { getLevelInfo } from './utils/levelSystem';
import WatchPage from './pages/WatchPage';
import ReviewPage from './pages/ReviewPage';
import ExamPage from './pages/ExamPage';
import ResultsPage from './pages/ResultsPage';
import VocabularyPage from './pages/VocabularyPage';
import FoldersPage from './pages/FoldersPage';
import LeaderboardPage from './pages/LeaderboardPage';
import BattlePage from './pages/BattlePage';
import FlashcardsPage from './pages/FlashcardsPage';
import HomePage from './pages/HomePage';
import SubjectHub from './pages/SubjectHub';
import SubjectDashboard from './pages/SubjectDashboard';
import MathSurvival from './pages/MathSurvival';
import OnboardingGuide, { shouldShowOnboarding } from './components/OnboardingGuide';

// ── Portal-exit animation (CSS-only, no Framer Motion) ────────────────
const PortalStyles = () => (
  <style>{`
    @keyframes portal-out {
      from { transform: scale(1);    opacity: 1; }
      to   { transform: scale(0.86); opacity: 0; }
    }
    .page-portal-exit { animation: portal-out 0.28s cubic-bezier(0.4,0,0.6,1) forwards; }
  `}</style>
);

// ── Subject CSS variables — applied to root div so all pages can use var(--sub-*) ──
const SUBJECT_VARS = {
  english: { '--sub-from': '#9333ea', '--sub-to': '#ec4899', '--sub-accent': '#a855f7', '--sub-glow': '168,85,247' },
  math:    { '--sub-from': '#2563eb', '--sub-to': '#06b6d4', '--sub-accent': '#3b82f6', '--sub-glow': '6,182,212'  },
  hebrew:  { '--sub-from': '#f59e0b', '--sub-to': '#dc2626', '--sub-accent': '#f97316', '--sub-glow': '249,115,22' },
};

// ── Profile button + dropdown ─────────────────────────────────────────
const ProfileButton = () => {
  const { supabaseUser, supabaseProfile, supabaseSignOut } = useVocab();
  const { isDark, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  if (!supabaseUser) return null;

  const name     = supabaseProfile?.full_name || supabaseUser.email || '?';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const xp       = supabaseProfile?.xp_points ?? 0;
  const dept     = supabaseProfile?.department || '';
  const lvl      = getLevelInfo(xp);

  return (
    <div ref={ref} className="relative">
      {/* Avatar button — shows level badge overlay */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-900/40 flex-shrink-0 active:scale-95 transition"
        aria-label="פרופיל"
      >
        {initials || <User size={18} />}
        {/* Level mini-badge */}
        <span className={`absolute -bottom-1 -left-1 text-[9px] font-black px-1 rounded-full border ${lvl.styles.bg} ${lvl.styles.border} ${lvl.styles.text}`}>
          {lvl.level}
        </span>
      </button>

      {open && (
        <div
          className="absolute left-0 top-12 z-50 w-64 rounded-2xl border shadow-2xl p-4 flex flex-col gap-3
            bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700"
          dir="rtl"
        >
          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
              {initials || <User size={18} />}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="font-black text-sm truncate text-slate-900 dark:text-white">{name}</p>
              {dept && <p className="text-xs text-slate-500 truncate">{dept}</p>}
              <p className="text-xs text-yellow-500 font-bold">⚡ {xp} XP</p>
            </div>
          </div>

          {/* Level + progress bar */}
          <div className={`rounded-xl border p-3 ${lvl.styles.bg} ${lvl.styles.border}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-black ${lvl.styles.text}`}>
                רמה {lvl.level} · {lvl.name}
              </span>
              {!lvl.isMax && (
                <span className="text-[10px] text-slate-400">
                  {lvl.progressXP} / {lvl.rangeXP}
                </span>
              )}
            </div>
            <div className="h-1.5 bg-black/20 rounded-full overflow-hidden" dir="ltr">
              <div
                className={`h-full rounded-full transition-all duration-700 ${lvl.styles.bar}`}
                style={{ width: `${lvl.progress * 100}%` }}
              />
            </div>
            {lvl.isMax && (
              <p className="text-[10px] text-center mt-1 text-slate-400">רמה מקסימלית</p>
            )}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700" />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition
              text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            {isDark ? 'מצב בהיר' : 'מצב כהה'}
          </button>

          {/* Sign out */}
          <button
            onClick={() => { supabaseSignOut(); setOpen(false); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition
              text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut size={16} /> התנתק
          </button>
        </div>
      )}
    </div>
  );
};

// ── Header ────────────────────────────────────────────────────────────
const Header = ({ onSwitchSubject }) => {
  const { currentSubject } = useVocab();
  return (
    <header
      className="sticky top-0 z-30 border-b w-full
        bg-white border-slate-200
        dark:bg-slate-950 dark:border-slate-800/50"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
        {/* Logo */}
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/40 flex-shrink-0">
          <BrainCircuit className="text-white w-6 h-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent leading-tight">
            Amirnet TV
          </h1>
          <p className="text-xs text-slate-500 font-medium leading-tight">מילון צפייה לאמירנט</p>
        </div>
        {/* Switch subject button — shown when a subject is already selected */}
        {currentSubject && (
          <button
            onClick={onSwitchSubject}
            aria-label="החלף מקצוע"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition active:scale-90
              text-slate-400 hover:text-white hover:bg-white/10 dark:hover:bg-white/10"
            title="החלף מקצוע"
          >
            <LayoutGrid size={17} />
          </button>
        )}
        {/* Profile button on physical left (logical end in RTL) */}
        <ProfileButton />
      </div>
    </header>
  );
};

// ── Subject guard — redirects to /hub until a subject is chosen ──────
const SubjectGuard = ({ children }) => {
  const { currentSubject } = useVocab();
  if (!currentSubject) return <Navigate to="/hub" replace />;
  return children;
};

// ── Forced auth gate ──────────────────────────────────────────────────
const AuthGate = ({ children }) => {
  const { supabaseUser, supabaseSignIn, supabaseSignUp, isSupabaseReady } = useVocab();

  if (!isSupabaseReady) return children;
  if (supabaseUser)     return children;

  return (
    <AuthModal
      forced
      onClose={() => {}}
      onSignIn={supabaseSignIn}
      onSignUp={supabaseSignUp}
    />
  );
};

// ── Smart redirect for "/" ─────────────────────────────────────────────
// Sends users to their subject dashboard, or /hub if none selected yet.
const SmartRedirect = () => {
  const { currentSubject } = useVocab();
  return <Navigate to={currentSubject ? `/${currentSubject}` : '/hub'} replace />;
};

// ── Root with theme class ─────────────────────────────────────────────
const ThemedApp = () => {
  const { isDark } = useTheme();
  const { levelUpEvent, clearLevelUpEvent, currentSubject } = useVocab();
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding);
  const [pageExiting, setPageExiting] = useState(false);
  const navigate = useNavigate();
  const subjectVars = SUBJECT_VARS[currentSubject] ?? {};

  const handleSwitchSubject = () => {
    setPageExiting(true);
    setTimeout(() => {
      setPageExiting(false);
      navigate('/hub');
    }, 285);
  };

  return (
    <div
      className={`${isDark ? 'dark' : ''} min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans`}
      dir="rtl"
      style={subjectVars}
    >
      <PortalStyles />
      <Header onSwitchSubject={handleSwitchSubject} />

      <main className={`pb-24 ${pageExiting ? 'page-portal-exit' : ''}`}>
        <AuthGate>
          <Routes>
            {/* Subject hub — no guard needed */}
            <Route path="/hub"     element={<SubjectHub />} />
            {/* Subject dashboards — set currentSubject on load (handles refresh) */}
            <Route path="/english" element={<SubjectDashboard subject="english" />} />
            <Route path="/math"    element={<SubjectDashboard subject="math" />}    />
            <Route path="/hebrew"  element={<SubjectDashboard subject="hebrew" />}  />
            {/* Root smart-redirects to /{subject} or /hub */}
            <Route path="/"        element={<SmartRedirect />} />
            {/* All other routes require a subject to be selected */}
            <Route path="/watch"       element={<SubjectGuard><WatchPage /></SubjectGuard>}        />
            <Route path="/review"      element={<SubjectGuard><ReviewPage /></SubjectGuard>}       />
            <Route path="/exam"        element={<SubjectGuard><ExamPage /></SubjectGuard>}         />
            <Route path="/results"     element={<SubjectGuard><ResultsPage /></SubjectGuard>}      />
            <Route path="/vocabulary"  element={<SubjectGuard><VocabularyPage /></SubjectGuard>}   />
            <Route path="/folders"     element={<SubjectGuard><FoldersPage /></SubjectGuard>}      />
            <Route path="/leaderboard" element={<SubjectGuard><LeaderboardPage /></SubjectGuard>}  />
            <Route path="/battle"      element={<SubjectGuard><BattlePage /></SubjectGuard>}       />
            <Route path="/flashcards"    element={<SubjectGuard><FlashcardsPage /></SubjectGuard>}   />
            <Route path="/math-survival" element={<SubjectGuard><MathSurvival /></SubjectGuard>}    />
            <Route path="/categories"    element={<Navigate to="/folders" replace />}              />
            <Route path="*"            element={<Navigate to="/" replace />}                       />
          </Routes>
        </AuthGate>
      </main>

      <NavBar />

      {showOnboarding && (
        <OnboardingGuide onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Level-up celebration — rendered above everything */}
      {levelUpEvent && (
        <LevelUpOverlay level={levelUpEvent.level} onDismiss={clearLevelUpEvent} />
      )}
    </div>
  );
};

const App = () => (
  <ThemeProvider>
    <VocabContextProvider>
      <ThemedApp />
    </VocabContextProvider>
  </ThemeProvider>
);

export default App;

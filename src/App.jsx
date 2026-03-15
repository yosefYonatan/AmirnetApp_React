import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { BrainCircuit, Sun, Moon, LogOut, User } from 'lucide-react';
import { VocabContextProvider, useVocab } from './context/VocabContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import NavBar from './components/NavBar';
import AuthModal from './components/AuthModal';
import WatchPage from './pages/WatchPage';
import ReviewPage from './pages/ReviewPage';
import ExamPage from './pages/ExamPage';
import ResultsPage from './pages/ResultsPage';
import VocabularyPage from './pages/VocabularyPage';
import FoldersPage from './pages/FoldersPage';
import LeaderboardPage from './pages/LeaderboardPage';
import BattlePage from './pages/BattlePage';
import FlashcardsPage from './pages/FlashcardsPage';
import OnboardingGuide, { shouldShowOnboarding } from './components/OnboardingGuide';

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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-900/40 flex-shrink-0 active:scale-95 transition"
        aria-label="פרופיל"
      >
        {initials || <User size={18} />}
      </button>

      {open && (
        <div
          className="absolute left-0 top-12 z-50 w-60 rounded-2xl border shadow-2xl p-4 flex flex-col gap-3
            bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700"
          dir="rtl"
        >
          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
              {initials || <User size={18} />}
            </div>
            <div className="overflow-hidden">
              <p className="font-black text-sm truncate text-slate-900 dark:text-white">{name}</p>
              {dept && <p className="text-xs text-slate-500 truncate">{dept}</p>}
              <p className="text-xs text-yellow-500 font-bold">⚡ {xp} XP</p>
            </div>
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
const Header = () => (
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
      {/* Profile button on physical left (logical end in RTL) */}
      <ProfileButton />
    </div>
  </header>
);

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

// ── Root with theme class ─────────────────────────────────────────────
const ThemedApp = () => {
  const { isDark } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding);

  return (
    <div
      className={`${isDark ? 'dark' : ''} min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans`}
      dir="rtl"
    >
      <Header />

      <main className="pb-28">
        <AuthGate>
          <Routes>
            <Route path="/"            element={<Navigate to="/vocabulary" replace />} />
            <Route path="/watch"       element={<WatchPage />}       />
            <Route path="/review"      element={<ReviewPage />}      />
            <Route path="/exam"        element={<ExamPage />}        />
            <Route path="/results"     element={<ResultsPage />}     />
            <Route path="/vocabulary"  element={<VocabularyPage />}  />
            <Route path="/folders"     element={<FoldersPage />}     />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/battle"      element={<BattlePage />}      />
            <Route path="/flashcards"  element={<FlashcardsPage />}  />
            <Route path="/categories"  element={<Navigate to="/folders" replace />} />
            <Route path="*"            element={<Navigate to="/vocabulary" replace />} />
          </Routes>
        </AuthGate>
      </main>

      <NavBar />

      {showOnboarding && (
        <OnboardingGuide onComplete={() => setShowOnboarding(false)} />
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

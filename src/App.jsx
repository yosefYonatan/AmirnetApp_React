import { Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { BrainCircuit } from 'lucide-react';
import { VocabContextProvider, useVocab } from './context/VocabContext';
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

// ==========================================
// App.jsx — Route definitions + Context provider
//
// Navigation:
//   /watch      — Live TV watching & word capture
//   /vocabulary — Academic DB library (50-word units, V/X/?)
//   /exam       — Exam from current episode words
//   /folders    — Unknown/Uncertain folders + show vocab
//
// Legacy /review and /categories kept for backwards compat.
// ==========================================

const Header = () => (
  <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-slate-800/60 w-full"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}>
    <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/40 flex-shrink-0">
        <BrainCircuit className="text-white w-6 h-6" />
      </div>
      <div>
        <h1 className="text-lg font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent leading-tight">
          Amirnet TV
        </h1>
        <p className="text-xs text-slate-500 font-medium leading-tight">מילון צפייה לאמירנט</p>
      </div>
    </div>
  </header>
);

// ── Forced auth gate ──────────────────────────────────────────────────
// Must live inside VocabContextProvider so it can call useVocab().
const AuthGate = ({ children }) => {
  const { supabaseUser, supabaseSignIn, supabaseSignUp, isSupabaseReady } = useVocab();

  // If Supabase isn't configured (dev/offline mode), skip the gate
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

const App = () => {
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding);

  return (
    <VocabContextProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" dir="rtl">
        <Header />

        {/* pb-28 gives space above the fixed NavBar (h-20 + safe area) */}
        <main className="pb-28">
          <AuthGate>
          <Routes>
            <Route path="/"            element={<Navigate to="/vocabulary" replace />} />
            <Route path="/watch"       element={<WatchPage />}       />
            {/* Legacy review route — keep for internal navigation */}
            <Route path="/review"      element={<ReviewPage />}      />
            <Route path="/exam"        element={<ExamPage />}        />
            <Route path="/results"     element={<ResultsPage />}     />
            <Route path="/vocabulary"  element={<VocabularyPage />}  />
            <Route path="/folders"      element={<FoldersPage />}      />
            <Route path="/leaderboard"  element={<LeaderboardPage />}  />
            <Route path="/battle"       element={<BattlePage />}       />
            <Route path="/flashcards"   element={<FlashcardsPage />}   />
            {/* Legacy categories route — redirect to folders */}
            <Route path="/categories"  element={<Navigate to="/folders" replace />} />
            <Route path="*"            element={<Navigate to="/vocabulary" replace />} />
          </Routes>
          </AuthGate>
        </main>

        <NavBar />

        {/* First-time onboarding overlay */}
        {showOnboarding && (
          <OnboardingGuide onComplete={() => setShowOnboarding(false)} />
        )}
      </div>
    </VocabContextProvider>
  );
};

export default App;

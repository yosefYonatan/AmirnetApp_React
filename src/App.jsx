import { Routes, Route, Navigate } from 'react-router-dom';
import { BrainCircuit } from 'lucide-react';
import { VocabContextProvider } from './context/VocabContext';
import NavBar from './components/NavBar';
import WatchPage from './pages/WatchPage';
import ReviewPage from './pages/ReviewPage';
import ExamPage from './pages/ExamPage';
import ResultsPage from './pages/ResultsPage';
import CategoriesPage from './pages/CategoriesPage';

// ==========================================
// App.jsx — Route definitions + Context provider
//
// Architecture note:
//   VocabContextProvider wraps ALL routes so any page can call
//   useVocab() to access shared state without prop drilling.
//
//   BrowserRouter lives in main.jsx (not here) so App is testable —
//   in tests you can wrap App with MemoryRouter instead.
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

const App = () => (
  <VocabContextProvider>
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" dir="rtl">
      <Header />

      {/* pb-28 gives space above the fixed NavBar (h-20 + safe area) */}
      <main className="pb-28">
        <Routes>
          <Route path="/" element={<Navigate to="/watch" replace />} />
          <Route path="/watch"   element={<WatchPage />}   />
          <Route path="/review"  element={<ReviewPage />}  />
          <Route path="/exam"    element={<ExamPage />}    />
          <Route path="/results"    element={<ResultsPage />}    />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="*"           element={<Navigate to="/watch" replace />} />
        </Routes>
      </main>

      <NavBar />
    </div>
  </VocabContextProvider>
);

export default App;

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Swords, Zap } from 'lucide-react';
import { useVocab } from '../context/VocabContext';
import GlobalStats from '../components/GlobalStats';
import HomePage from './HomePage';

// ── Config per subject ────────────────────────────────────────────────
const SUBJECT_META = {
  english: {
    label: 'English',
    heLabel: 'אנגלית',
    gradientFrom: '#9333ea',
    gradientTo:   '#ec4899',
    symbols: ['Aa', 'Bb', '≈'],
    ready: true,  // English has full content via academicDB
  },
  math: {
    label: 'Math',
    heLabel: 'מתמטיקה',
    gradientFrom: '#2563eb',
    gradientTo:   '#06b6d4',
    symbols: ['+', '√', 'x²'],
    ready: false,
    survivalRoute: '/math-survival',  // Math has its own drill mode
  },
  hebrew: {
    label: 'עברית',
    heLabel: 'הבעה בכתב',
    gradientFrom: '#f59e0b',
    gradientTo:   '#dc2626',
    symbols: ['א', 'ב', 'פ'],
    ready: false,
  },
};

// ── Placeholder for subjects without content yet ──────────────────────
const ComingSoon = ({ meta }) => {
  const navigate = useNavigate();
  return (
    <div className="w-full max-w-xl mx-auto px-4 pt-2 pb-6 space-y-4" dir="rtl">
      {/* Banner */}
      <div
        className="rounded-3xl overflow-hidden border border-white/10"
        style={{ background: `linear-gradient(135deg, ${meta.gradientFrom}22, ${meta.gradientTo}22)` }}
      >
        {/* Gradient strip */}
        <div
          className="h-24 flex items-center justify-center gap-4"
          style={{ background: `linear-gradient(135deg, ${meta.gradientFrom}, ${meta.gradientTo})` }}
        >
          {meta.symbols.map((s, i) => (
            <span key={i} className="text-white font-black text-3xl drop-shadow-lg opacity-90">{s}</span>
          ))}
        </div>
        <div className="p-5">
          <h2 className="font-black text-xl text-white mb-1">{meta.heLabel}</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            תוכן ייעודי ל-{meta.heLabel} בפיתוח. בינתיים תוכל לתרגל מילים אנגליות ולצבור XP!
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        {/* Survival Blitz — shown only for math subject */}
        {meta.survivalRoute && (
          <button
            onClick={() => navigate(meta.survivalRoute)}
            className="w-full flex items-center gap-4 p-5 rounded-2xl transition-all active:scale-[0.98] relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${meta.gradientFrom}, ${meta.gradientTo})` }}
          >
            {/* Animated shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700 pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Zap size={24} className="text-white" />
            </div>
            <div className="text-right flex-1">
              <p className="font-black text-white text-lg leading-tight">Survival Blitz ⚡</p>
              <p className="text-white/75 text-sm leading-tight">3 שניות לשאלה · ריבועים · שורשים · פעולות</p>
            </div>
          </button>
        )}

        <button
          onClick={() => navigate('/flashcards')}
          className="w-full flex items-center gap-4 p-5 rounded-2xl transition-all active:scale-[0.98]"
          style={{ background: `linear-gradient(135deg, ${meta.gradientFrom}88, ${meta.gradientTo}88)` }}
        >
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Layers size={24} className="text-white" />
          </div>
          <div className="text-right flex-1">
            <p className="font-black text-white text-lg leading-tight">כרטיסיות</p>
            <p className="text-white/70 text-sm leading-tight">תרגל אוצר מילים עם SRS</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/battle')}
          className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 transition-all active:scale-[0.98] hover:bg-white/10"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Swords size={24} className="text-white/80" />
          </div>
          <div className="text-right flex-1">
            <p className="font-black text-white text-lg leading-tight">קרב מהיר</p>
            <p className="text-slate-400 text-sm leading-tight">תחרה נגד חבר או בוט</p>
          </div>
        </button>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────
const SubjectDashboard = ({ subject }) => {
  const { currentSubject, setCurrentSubject } = useVocab();
  const meta = SUBJECT_META[subject];

  // Set subject on mount (and whenever the subject prop changes).
  // This handles "persistent memory on refresh": if the user lands
  // directly on /math, this sets currentSubject='math' automatically.
  useEffect(() => {
    if (currentSubject !== subject) {
      setCurrentSubject(subject);
    }
  }, [subject]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!meta) return null;

  return (
    <>
      {/* GlobalStats sits above the subject content */}
      <div className="w-full max-w-xl mx-auto px-4 pt-4">
        <GlobalStats />
      </div>

      {meta.ready ? (
        // English: reuse the full HomePage (word stats, XP, quick actions)
        <HomePage />
      ) : (
        // Math / Hebrew: placeholder with coming-soon banner + quick actions
        <ComingSoon meta={meta} />
      )}
    </>
  );
};

export default SubjectDashboard;

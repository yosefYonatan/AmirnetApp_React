import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit } from 'lucide-react';
import { useVocab, SUBJECTS } from '../context/VocabContext';
import GlobalStats from '../components/GlobalStats';

// ── CSS keyframe animations ───────────────────────────────────────────
const HubStyles = () => (
  <style>{`
    @keyframes hub-bg-pulse {
      0%, 100% { opacity: 0.6; }
      50%       { opacity: 1;   }
    }
    @keyframes card-enter {
      from { opacity: 0; transform: translateY(28px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }
    @keyframes pulse-glow {
      0%   { box-shadow: var(--card-glow-start); }
      50%  { box-shadow: var(--card-glow-peak);  }
      100% { box-shadow: var(--card-glow-start); }
    }
    .hub-card {
      animation: card-enter 0.48s cubic-bezier(0.22, 1, 0.36, 1) both;
      transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.25s ease;
      cursor: pointer;
      will-change: transform;
    }
    .hub-card:hover  { transform: scale(1.035); }
    .hub-card:active { transform: scale(0.97);  }
    .hub-card-selected {
      animation: pulse-glow 0.28s ease forwards !important;
      transform: scale(1.06) !important;
      opacity: 0.6 !important;
      pointer-events: none;
    }
    @keyframes title-enter {
      from { opacity: 0; transform: translateY(-16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .hub-title { animation: title-enter 0.42s ease both; }
  `}</style>
);

// ── Subject card definitions ──────────────────────────────────────────
const CARDS = [
  {
    id: SUBJECTS.ENGLISH,
    label: 'English',
    heLabel: 'אנגלית',
    desc: 'אוצר מילים · הבנת הנקרא · אנלוגיות',
    gradientFrom: '#9333ea',
    gradientTo:   '#ec4899',
    glowRgb:      '168,85,247',
    symbols: ['Aa', 'Bb', '≈', '→'],
  },
  {
    id: SUBJECTS.MATH,
    label: 'Math',
    heLabel: 'מתמטיקה',
    desc: 'אלגברה · גיאומטריה · סטטיסטיקה',
    gradientFrom: '#2563eb',
    gradientTo:   '#06b6d4',
    glowRgb:      '6,182,212',
    symbols: ['+', '√', 'x²', '!'],
  },
  {
    id: SUBJECTS.HEBREW,
    label: 'עברית',
    heLabel: 'הבעה בכתב',
    desc: 'תחביר · שפה · הבנת הנקרא',
    gradientFrom: '#f59e0b',
    gradientTo:   '#dc2626',
    glowRgb:      '239,68,68',
    symbols: ['א', 'ב', 'פ', '״'],
  },
];

// ── Main component ────────────────────────────────────────────────────
const SubjectHub = () => {
  const navigate = useNavigate();
  const { setCurrentSubject } = useVocab();
  const [selectedId, setSelectedId] = useState(null);

  const handleSelect = (card) => {
    if (selectedId) return; // already transitioning
    setSelectedId(card.id);
    setTimeout(() => {
      setCurrentSubject(card.id);
      navigate('/', { replace: true });
    }, 320);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start bg-slate-950 overflow-x-hidden"
      dir="rtl"
    >
      <HubStyles />

      {/* ── Ambient background blobs ──────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #9333ea, transparent)' }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-15"
          style={{ background: 'radial-gradient(circle, #2563eb, transparent)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }}
        />
      </div>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-lg px-5 pt-8 pb-4 text-center hub-title">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
            <BrainCircuit className="text-white w-6 h-6" />
          </div>
        </div>
        <h1 className="text-3xl font-black text-white leading-tight mb-1">
          בחר מקצוע
        </h1>
        <p className="text-slate-400 text-sm font-medium">
          בחר את המקצוע שתרצה להתמקד בו — תוכל לשנות בכל עת
        </p>
      </div>

      {/* ── Global daily progress ────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-lg px-4 pb-2">
        <GlobalStats />
      </div>

      {/* ── Cards grid ───────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-lg px-4 pb-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:justify-center">
        {CARDS.map((card, i) => {
          const isSelected = selectedId === card.id;
          const glowStart  = `0 0 30px rgba(${card.glowRgb},0.35), 0 8px 32px rgba(0,0,0,0.5)`;
          const glowPeak   = `0 0 60px rgba(${card.glowRgb},0.7), 0 8px 40px rgba(0,0,0,0.5)`;
          const idleGlow   = `0 4px 24px rgba(0,0,0,0.4)`;

          return (
            <div
              key={card.id}
              role="button"
              tabIndex={0}
              aria-label={`בחר ${card.heLabel}`}
              onClick={() => handleSelect(card)}
              onKeyDown={(e) => e.key === 'Enter' && handleSelect(card)}
              className={`hub-card flex-1 min-w-[260px] rounded-3xl overflow-hidden border border-white/10 ${isSelected ? 'hub-card-selected' : ''}`}
              style={{
                animationDelay: `${i * 90}ms`,
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: isSelected ? glowPeak : idleGlow,
                '--card-glow-start': glowStart,
                '--card-glow-peak':  glowPeak,
              }}
            >
              {/* Gradient strip */}
              <div
                className="h-36 w-full flex items-center justify-center gap-3 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${card.gradientFrom}, ${card.gradientTo})` }}
              >
                {/* Sheen overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                {/* Subject symbols */}
                {card.symbols.map((sym, si) => (
                  <span
                    key={si}
                    className="text-white font-black text-xl drop-shadow-lg"
                    style={{
                      opacity: 0.7 + si * 0.08,
                      transform: `rotate(${(si - 1.5) * 8}deg)`,
                      fontSize: si === 0 ? '2rem' : si === 1 ? '1.6rem' : '1.3rem',
                    }}
                  >
                    {sym}
                  </span>
                ))}
              </div>

              {/* Card body */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h2 className="text-white font-black text-xl leading-tight">{card.heLabel}</h2>
                    <p
                      className="text-sm font-bold mt-0.5"
                      style={{ color: `rgba(${card.glowRgb},0.9)` }}
                    >
                      {card.label}
                    </p>
                  </div>
                  {/* Color dot */}
                  <div
                    className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${card.gradientFrom}, ${card.gradientTo})`, boxShadow: `0 0 8px rgba(${card.glowRgb},0.6)` }}
                  />
                </div>
                <p className="text-slate-400 text-xs font-medium leading-relaxed">{card.desc}</p>

                {/* CTA */}
                <div
                  className="mt-4 w-full py-2.5 rounded-xl text-center text-sm font-black text-white"
                  style={{ background: `linear-gradient(135deg, ${card.gradientFrom}cc, ${card.gradientTo}cc)` }}
                >
                  {isSelected ? '...' : 'בחר מקצוע'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <p className="relative z-10 text-slate-600 text-xs pb-6 font-medium hub-title" style={{ animationDelay: '360ms' }}>
        Amirnet Psychometric Platform
      </p>
    </div>
  );
};

export default SubjectHub;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Tv, Swords, Zap, TrendingUp, Award } from 'lucide-react';
import { useVocab, WORD_STATUS } from '../context/VocabContext';
import { getLevelInfo } from '../utils/levelSystem';
import { supabase, isSupabaseReady } from '../services/supabaseClient';

// ── CSS-only entrance animation (Framer Motion excluded per PRD §9) ──
const HomeStyles = () => (
  <style>{`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0);    }
    }
    .home-card { animation: fadeInUp 0.42s ease both; }
  `}</style>
);

// Glow box-shadow keyed by level color — creates the "rank aura" effect
const GLOW = {
  gray:   '0 0 0 0 transparent',
  blue:   '0 0 22px rgba(59,130,246,0.18)',
  indigo: '0 0 22px rgba(99,102,241,0.20)',
  purple: '0 0 22px rgba(168,85,247,0.22)',
  pink:   '0 0 24px rgba(236,72,153,0.22)',
  rose:   '0 0 24px rgba(244,63,94,0.20)',
  orange: '0 0 26px rgba(249,115,22,0.24)',
  amber:  '0 0 28px rgba(245,158,11,0.26)',
  yellow: '0 0 30px rgba(234,179,8,0.28)',
  gold:   '0 0 36px rgba(250,204,21,0.34)',
};

// ── Main component ─────────────────────────────────────────────────────
const HomePage = () => {
  const navigate = useNavigate();
  const { wordStatuses, supabaseUser, supabaseProfile } = useVocab();

  const [battleStats, setBattleStats] = useState({ battles: 0, score: 0 });
  const [loadingBattle, setLoadingBattle] = useState(false);

  // ── Word status counts ────────────────────────────────────────────
  const statuses = Object.values(wordStatuses);
  const known    = statuses.filter(s => s === WORD_STATUS.KNOWN).length;
  const learning = statuses.filter(s => s === WORD_STATUS.UNKNOWN || s === WORD_STATUS.UNCERTAIN).length;
  const total    = statuses.length;

  // ── Level & XP ───────────────────────────────────────────────────
  const xp   = supabaseProfile?.xp_points ?? 0;
  const lvl  = getLevelInfo(xp);
  const glow = GLOW[lvl.color] ?? GLOW.blue;

  // ── Profile display ───────────────────────────────────────────────
  const streak   = supabaseProfile?.streak_days ?? 0;
  const name     = supabaseProfile?.full_name || supabaseUser?.email?.split('@')[0] || 'שחקן';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // ── Battle stats (direct Supabase query) ─────────────────────────
  useEffect(() => {
    if (!isSupabaseReady || !supabaseUser) return;
    setLoadingBattle(true);
    supabase
      .from('battle_players')
      .select('score')
      .eq('user_id', supabaseUser.id)
      .then(({ data }) => {
        if (!data) return;
        setBattleStats({
          battles: data.length,
          score:   data.reduce((sum, p) => sum + (p.score ?? 0), 0),
        });
      })
      .finally(() => setLoadingBattle(false));
  }, [supabaseUser]);

  const xpToNext = lvl.isMax ? 0 : lvl.rangeXP - lvl.progressXP;

  return (
    <div className="w-full max-w-xl mx-auto px-4 pt-4 pb-6 space-y-4" dir="rtl">
      <HomeStyles />

      {/* ── Hero Card ──────────────────────────────────────────────────── */}
      <div
        className="home-card rounded-3xl border p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        style={{ boxShadow: glow, animationDelay: '0ms' }}
      >
        {/* Top row: avatar + info + streak */}
        <div className="flex items-center gap-4 mb-4">
          {/* Avatar */}
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl flex-shrink-0 shadow-lg shadow-indigo-900/30">
            {initials}
            <span
              className={`absolute -bottom-1.5 -left-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-full border ${lvl.styles.bg} ${lvl.styles.border} ${lvl.styles.text}`}
            >
              {lvl.level}
            </span>
          </div>

          {/* Name + level */}
          <div className="flex-1 min-w-0">
            <p className="font-black text-lg text-slate-900 dark:text-white truncate leading-tight">{name}</p>
            <p className={`text-sm font-bold ${lvl.styles.text} leading-tight`}>
              רמה {lvl.level} · {lvl.name}
            </p>
            <p className="text-xs text-yellow-500 font-bold flex items-center gap-1 mt-0.5">
              <Zap size={11} /> {xp.toLocaleString()} XP
            </p>
          </div>

          {/* Streak pill */}
          <div className="flex flex-col items-center bg-orange-500/10 border border-orange-500/25 rounded-2xl px-3 py-2 flex-shrink-0">
            <Flame size={20} className="text-orange-400" />
            <span className="text-orange-400 font-black text-lg leading-none">{streak}</span>
            <span className="text-orange-400/70 text-[9px] font-bold leading-none mt-0.5">ימים</span>
          </div>
        </div>

        {/* XP progress bar */}
        <div className={`rounded-xl border p-3 ${lvl.styles.bg} ${lvl.styles.border}`}>
          <div className="flex justify-between items-center mb-1.5">
            <span className={`text-xs font-black ${lvl.styles.text}`}>{lvl.name}</span>
            {lvl.isMax
              ? <span className="text-[11px] text-slate-400">רמה מקסימלית 🏆</span>
              : <span className="text-[11px] text-slate-400">{lvl.progressXP.toLocaleString()} / {lvl.rangeXP.toLocaleString()} XP</span>
            }
          </div>
          <div className="h-2.5 bg-black/20 rounded-full overflow-hidden" dir="ltr">
            <div
              className={`h-full rounded-full transition-all duration-700 ${lvl.styles.bar}`}
              style={{ width: `${Math.min(lvl.progress * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Word Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'ידועות',  value: known,    emoji: '✅', color: 'text-green-400', delay: '80ms'  },
          { label: 'לומד',    value: learning, emoji: '📚', color: 'text-blue-400',  delay: '140ms' },
          { label: 'סה״כ',   value: total,    emoji: '📖', color: 'text-slate-400', delay: '200ms' },
        ].map(({ label, value, emoji, color, delay }) => (
          <div
            key={label}
            className="home-card rounded-2xl border p-4 text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            style={{ boxShadow: glow, animationDelay: delay }}
          >
            <div className="text-2xl mb-1">{emoji}</div>
            <div className={`font-black text-2xl ${color}`}>{value.toLocaleString()}</div>
            <div className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Battle Stats ───────────────────────────────────────────────── */}
      <div
        className="home-card grid grid-cols-2 gap-3"
        style={{ animationDelay: '260ms' }}
      >
        <div
          className="rounded-2xl border p-4 text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          style={{ boxShadow: glow }}
        >
          <Swords size={22} className="text-red-400 mx-auto mb-1" />
          <div className="font-black text-2xl text-slate-900 dark:text-white">
            {loadingBattle ? '—' : battleStats.battles.toLocaleString()}
          </div>
          <div className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-0.5">קרבות</div>
        </div>
        <div
          className="rounded-2xl border p-4 text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          style={{ boxShadow: glow }}
        >
          <Award size={22} className="text-yellow-400 mx-auto mb-1" />
          <div className="font-black text-2xl text-yellow-400">
            {loadingBattle ? '—' : battleStats.score.toLocaleString()}
          </div>
          <div className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-0.5">ניקוד כולל</div>
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────────── */}
      <div
        className="home-card space-y-3"
        style={{ animationDelay: '320ms' }}
      >
        <button
          onClick={() => navigate('/watch')}
          className="w-full flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all active:scale-[0.98] shadow-lg shadow-blue-900/25"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Tv size={24} className="text-white" />
          </div>
          <div className="text-right flex-1">
            <p className="font-black text-white text-lg leading-tight">התחל לצפות</p>
            <p className="text-blue-200 text-sm leading-tight">למד מהסדרות האהובות עליך</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/battle')}
          className="w-full flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-l from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 transition-all active:scale-[0.98] shadow-lg shadow-red-900/25"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Swords size={24} className="text-white" />
          </div>
          <div className="text-right flex-1">
            <p className="font-black text-white text-lg leading-tight">קרב מהיר</p>
            <p className="text-red-200 text-sm leading-tight">תחרה נגד חבר או בוט עכשיו</p>
          </div>
        </button>
      </div>

      {/* ── Progress teaser ────────────────────────────────────────────── */}
      <div
        className="home-card rounded-2xl border p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center gap-3"
        style={{ boxShadow: glow, animationDelay: '400ms' }}
      >
        <TrendingUp size={20} className="text-green-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
            {known === 0 ? 'התחל ללמוד — הפוך כרטיסיות ראשונות' : `${known.toLocaleString()} מילים בשליטה מלאה 💪`}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {lvl.isMax ? 'הגעת לרמה המקסימלית — אגדה!' : `עוד ${xpToNext.toLocaleString()} XP לרמה הבאה`}
          </p>
        </div>
        <button
          onClick={() => navigate('/flashcards')}
          className="flex-shrink-0 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-black text-xs text-white transition active:scale-95"
        >
          תרגל
        </button>
      </div>
    </div>
  );
};

export default HomePage;

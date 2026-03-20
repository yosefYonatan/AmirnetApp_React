import React, { useState, useEffect } from 'react';
import { Trophy, Star, Zap, Users, LogIn } from 'lucide-react';
import { supabase, isSupabaseReady } from '../services/supabaseClient';
import { useVocab } from '../context/VocabContext';
import AuthModal from '../components/AuthModal';
import { getLevelInfo } from '../utils/levelSystem';

// ==========================================
// LeaderboardPage — BGU Student XP Rankings
//
// Shows top 20 users by XP from Supabase profiles.
// Department filter: כולם / מדמח BGU / הנדסה BGU
// Falls back gracefully when Supabase is not configured.
// ==========================================

const DEPT_OPTIONS = [
  { value: 'all',         label: 'כולם'         },
  { value: 'cs',          label: '🖥️ מדמח BGU'   },
  { value: 'engineering', label: '⚙️ הנדסה BGU'  },
  { value: 'other',       label: '🎓 אחר'         },
];

const RANK_STYLES = [
  'text-yellow-300 bg-yellow-500/20 border-yellow-500/40',  // 1st
  'text-slate-300  bg-slate-500/20  border-slate-500/40',   // 2nd
  'text-amber-500  bg-amber-600/20  border-amber-600/40',   // 3rd
];

const LeaderboardPage = () => {
  const { supabaseUser, supabaseSignIn, supabaseSignUp, supabaseProfile } = useVocab();
  const [dept, setDept]           = useState('all');
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [showAuth, setShowAuth]   = useState(false);

  // ── Fetch + Realtime subscription ────────────────────────────────
  useEffect(() => {
    if (!isSupabaseReady) return;

    // Initial fetch
    const fetchRows = () => {
      setLoading(true);
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, department, xp_points')
        .order('xp_points', { ascending: false })
        .limit(20);

      if (dept !== 'all') {
        query = query.eq('department', dept);
      }

      query.then(({ data, error }) => {
        setLoading(false);
        if (!error && data) setRows(data);
      });
    };

    fetchRows();

    // Realtime: re-fetch whenever any profile's XP changes
    // Requires: ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    // (already included in supabase-schema.sql)
    const channel = supabase
      .channel('leaderboard-xp')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        () => fetchRows()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dept]);

  // ── Not configured fallback ──────────────────────────────────────
  if (!isSupabaseReady) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] px-6 text-center gap-4">
        <Trophy size={56} className="text-yellow-400 opacity-40" />
        <p className="text-slate-400 font-bold text-lg">לוח תוצאות</p>
        <p className="text-slate-500 text-sm max-w-xs">
          הלוח מצריך חיבור ל-Supabase.
          הוסף את VITE_SUPABASE_URL ו-VITE_SUPABASE_ANON_KEY ל-.env כדי להפעיל.
        </p>
      </div>
    );
  }

  const myId = supabaseUser?.id;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-4 pb-4 space-y-4">

      {/* Header */}
      <div className="bg-gradient-to-br from-yellow-900/30 to-amber-900/20 border border-yellow-800/30 rounded-3xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center flex-shrink-0">
          <Trophy size={28} className="text-yellow-400" />
        </div>
        <div className="flex-1">
          <h2 className="font-black text-xl text-white">לוח המובילים</h2>
          <p className="text-slate-400 text-sm">רוויחו XP על כל תשובה נכונה במבחן</p>
        </div>
        {/* Auth button */}
        {!supabaseUser && (
          <button
            onClick={() => setShowAuth(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold transition active:scale-95"
          >
            <LogIn size={16} /> כניסה
          </button>
        )}
        {supabaseUser && supabaseProfile && (
          <div className="text-right">
            <div className="flex items-center gap-1 text-yellow-400 font-black text-lg">
              <Zap size={18} /> {supabaseProfile.xp_points ?? 0}
            </div>
            <div className="text-slate-500 text-xs">הניקוד שלך</div>
          </div>
        )}
      </div>

      {/* Department filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {DEPT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setDept(opt.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition active:scale-95
              ${dept === opt.value
                ? 'bg-blue-600/30 border-blue-500/50 text-blue-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Leaderboard list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold">אין שחקנים עדיין</p>
          <p className="text-sm mt-1">היה הראשון לגבור על המבחן!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row, idx) => {
            const rank        = idx + 1;
            const isMe        = row.id === myId;
            const rankStyle   = RANK_STYLES[idx] ?? 'text-slate-400 bg-slate-800 border-slate-700';
            const displayName = row.full_name || row.email?.split('@')[0] || 'אנונימי';
            const lvl         = getLevelInfo(row.xp_points ?? 0);

            return (
              <div
                key={row.id}
                className={`rounded-2xl p-4 border flex items-center gap-4 transition
                  ${isMe
                    ? 'bg-blue-900/20 border-blue-700/40'
                    : 'bg-slate-900 border-slate-800'
                  }`}
              >
                {/* Rank badge */}
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 font-black text-sm ${rankStyle}`}>
                  {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : rank}
                </div>

                {/* Name + dept + level badge */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-black text-base ${isMe ? 'text-blue-300' : 'text-white'}`}>
                      {displayName}
                    </span>
                    {isMe && <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">אתה</span>}
                    {/* Level badge */}
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${lvl.styles.bg} ${lvl.styles.border} ${lvl.styles.text}`}>
                      Lv.{lvl.level} {lvl.name}
                    </span>
                  </div>
                  {row.department && row.department !== 'other' && (
                    <p className="text-slate-500 text-xs mt-0.5">
                      {row.department === 'cs' ? '🖥️ מדמח' : '⚙️ הנדסה'} · BGU
                    </p>
                  )}
                </div>

                {/* XP */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Zap size={16} className="text-yellow-400" />
                  <span className="font-black text-yellow-300 text-lg">{row.xp_points ?? 0}</span>
                  <span className="text-slate-600 text-xs">XP</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* XP info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">איך מרוויחים XP?</p>
        <div className="flex items-center gap-3">
          <Star size={16} className="text-yellow-400 flex-shrink-0" />
          <p className="text-slate-400 text-sm">+10–15 XP על כל תשובה נכונה בקרב</p>
        </div>
        <div className="flex items-center gap-3">
          <Star size={16} className="text-yellow-400 flex-shrink-0" />
          <p className="text-slate-400 text-sm">+5 XP על כל 10 כרטיסיות בהחלקה</p>
        </div>
        <div className="flex items-center gap-3">
          <Star size={16} className="text-yellow-400 flex-shrink-0" />
          <p className="text-slate-400 text-sm">+10 XP על כל תשובה נכונה במבחן</p>
        </div>
        <div className="border-t border-slate-800 pt-2 text-slate-500 text-xs">
          10 רמות · מתחיל → לומד → סקרן → מתקדם → מיומן → מומחה → אלוף → אגדה → גאון → מאסטר
        </div>
        {!supabaseUser && (
          <p className="text-slate-600 text-xs">
            ⚠️ צריך להתחבר כדי לצבור נקודות ולהופיע בלוח
          </p>
        )}
      </div>

      {/* Auth modal */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSignIn={supabaseSignIn}
          onSignUp={supabaseSignUp}
        />
      )}
    </div>
  );
};

export default LeaderboardPage;

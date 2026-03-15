import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Swords, Bot, Users, Copy, Check, Play, Crown,
  Zap, CheckCircle2, XCircle, Clock, LogIn, RefreshCw, Settings, AlertTriangle
} from 'lucide-react';
import { supabase, isSupabaseReady } from '../services/supabaseClient';
import { useVocab } from '../context/VocabContext';
import rawData from '../data/academicDB.json';

const ALL_WORDS   = [...rawData].sort((a, b) => a.word.localeCompare(b.word));
const UNIT_SIZE   = 50;
const TOTAL_UNITS = Math.ceil(ALL_WORDS.length / UNIT_SIZE);

const TIME_OPTIONS  = [5, 10, 13];
const COUNT_OPTIONS = [5, 10, 15, 20];
const FLASH_SECONDS = 10;

// ── helpers ──────────────────────────────────────────────────────────
const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const pickQuestions = (unitIndex, count = 10) => {
  const unitWords = ALL_WORDS
    .slice(unitIndex * UNIT_SIZE, (unitIndex + 1) * UNIT_SIZE)
    .filter(w => w.translation);
  const picked = [...unitWords].sort(() => 0.5 - Math.random()).slice(0, count);
  const allTranslations = ALL_WORDS.map(w => w.translation).filter(Boolean);
  return picked.map(word => {
    const distractors = allTranslations
      .filter(t => t !== word.translation)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    const options = [...distractors, word.translation].sort(() => 0.5 - Math.random());
    return { word: word.word, translation: word.translation, options };
  });
};

const getPlayerName = () => {
  let name = localStorage.getItem('amirnet_battle_name');
  if (!name) {
    name = 'שחקן ' + Math.floor(Math.random() * 900 + 100);
    localStorage.setItem('amirnet_battle_name', name);
  }
  return name;
};

// ── Animation styles (injected once) ────────────────────────────────
const BattleStyles = () => (
  <style>{`
    @keyframes starFly {
      0%   { transform: translateY(0)   scale(1)   rotate(0deg);   opacity: 1; }
      100% { transform: translateY(-140px) scale(2) rotate(30deg);  opacity: 0; }
    }
    @keyframes starFlyR {
      0%   { transform: translateY(0) scale(1); opacity: 1; }
      100% { transform: translateY(-110px) translateX(50px) scale(1.8); opacity: 0; }
    }
    @keyframes starFlyL {
      0%   { transform: translateY(0) scale(1); opacity: 1; }
      100% { transform: translateY(-110px) translateX(-50px) scale(1.8); opacity: 0; }
    }
    @keyframes alarmPulse {
      0%, 100% { opacity: 0; }
      40%, 60%  { opacity: 0.4; }
    }
    .star-c { animation: starFly  0.9s ease-out forwards; }
    .star-r { animation: starFlyR 0.9s ease-out forwards; }
    .star-l { animation: starFlyL 0.9s ease-out forwards; }
    .alarm  { animation: alarmPulse 0.35s ease-in-out 3; }
  `}</style>
);

// ── Star burst ───────────────────────────────────────────────────────
const STAR_CLASSES = ['star-c','star-r','star-l','star-c','star-r','star-l','star-c','star-r','star-l','star-c'];
const StarBurst = ({ active }) => {
  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {STAR_CLASSES.map((cls, i) => (
        <span
          key={i}
          className={`absolute text-2xl ${cls}`}
          style={{ left: `${18 + i * 7}%`, top: '58%', animationDelay: `${i * 55}ms` }}
        >
          {i % 2 === 0 ? '⭐' : '✨'}
        </span>
      ))}
    </div>
  );
};

// ── Alarm overlay ────────────────────────────────────────────────────
const AlarmOverlay = ({ active }) =>
  active ? <div className="alarm pointer-events-none fixed inset-0 z-50 bg-red-600" /> : null;

// ── Bot logic ────────────────────────────────────────────────────────
const BOT_NAME         = '🤖 AmirBot';
const BOT_CORRECT_RATE = 0.65;

const useBotOpponent = (question, onBotAnswer) => {
  const timerRef = useRef(null);
  useEffect(() => {
    if (!question) return;
    clearTimeout(timerRef.current);
    const delay   = 3000 + Math.random() * 7000;
    const correct = Math.random() < BOT_CORRECT_RATE;
    const answer  = correct
      ? question.translation
      : question.options.find(o => o !== question.translation) ?? question.options[0];
    timerRef.current = setTimeout(() => onBotAnswer(answer), delay);
    return () => clearTimeout(timerRef.current);
  }, [question, onBotAnswer]);
};

// ── Landing ──────────────────────────────────────────────────────────
const Landing = ({ onCreateRoom, onJoinRoom, onVsBot }) => {
  const [code, setCode] = useState('');
  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-6 space-y-5">
      <div className="text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-600/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
          <Swords size={30} className="text-red-400" />
        </div>
        <h2 className="font-black text-2xl text-white">קרב מילים</h2>
        <p className="text-slate-400 text-sm mt-1">תחרו בזמן אמת — מי מתרגם יותר מהר?</p>
      </div>

      <button onClick={onCreateRoom}
        className="w-full p-5 rounded-2xl border-2 border-blue-700/50 bg-blue-900/20 hover:bg-blue-900/30 flex items-center gap-4 text-right transition-all active:scale-[0.98]">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
          <Users size={24} className="text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="font-black text-lg text-white">צור חדר</p>
          <p className="text-slate-400 text-sm">שתף קוד עם חברים (עד 10 שחקנים)</p>
        </div>
      </button>

      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-3">
        <p className="text-sm font-bold text-slate-400">הצטרף לחדר</p>
        <div className="flex gap-2">
          <input
            type="text" dir="ltr" placeholder="קוד 6 ספרות"
            value={code} onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
            onKeyDown={e => e.key === 'Enter' && code.length === 6 && onJoinRoom(code)}
            className="flex-1 bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-xl py-3 px-4 text-white text-center font-mono text-lg outline-none tracking-widest uppercase placeholder:text-slate-600 placeholder:text-sm placeholder:tracking-normal placeholder:font-sans"
          />
          <button onClick={() => onJoinRoom(code)} disabled={code.length !== 6}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 rounded-xl font-black transition active:scale-95">
            הצטרף
          </button>
        </div>
      </div>

      <button onClick={onVsBot}
        className="w-full p-5 rounded-2xl border-2 border-slate-700 bg-slate-900 hover:border-slate-600 flex items-center gap-4 text-right transition-all active:scale-[0.98]">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
          <Bot size={24} className="text-slate-400" />
        </div>
        <div className="flex-1">
          <p className="font-black text-lg text-white">שחק נגד בוט</p>
          <p className="text-slate-400 text-sm">תרגול אישי — AmirBot מתחרה איתך</p>
        </div>
      </button>

      {!isSupabaseReady && (
        <p className="text-center text-slate-600 text-xs">
          ⚠️ מצב מרובה שחקנים דורש Supabase — משחק נגד בוט זמין תמיד
        </p>
      )}
    </div>
  );
};

// ── Unit selector with admin settings ────────────────────────────────
const UnitSelector = ({ onStart }) => {
  const [unit,     setUnit]     = useState(0);
  const [timeSec,  setTimeSec]  = useState(12);
  const [qCount,   setQCount]   = useState(10);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-6 space-y-4">
      <h2 className="font-black text-xl text-white text-center flex items-center justify-center gap-2">
        <Settings size={20} className="text-slate-400" /> הגדרות הקרב
      </h2>

      {/* Unit */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">יחידת מילים</p>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: TOTAL_UNITS }, (_, i) => (
            <button key={i} onClick={() => setUnit(i)}
              className={`py-3 rounded-xl font-black transition active:scale-90 text-sm
                ${i === unit ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Time per question */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <Clock size={12} /> זמן לשאלה (שניות)
        </p>
        <div className="flex gap-2">
          {TIME_OPTIONS.map(t => (
            <button key={t} onClick={() => setTimeSec(t)}
              className={`flex-1 py-3 rounded-xl font-black text-lg transition active:scale-90
                ${t === timeSec ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Question count */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <Zap size={12} /> מספר שאלות
        </p>
        <div className="flex gap-2">
          {COUNT_OPTIONS.map(c => (
            <button key={c} onClick={() => setQCount(c)}
              className={`flex-1 py-3 rounded-xl font-black text-lg transition active:scale-90
                ${c === qCount ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => onStart(unit, timeSec, qCount)}
        className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition active:scale-95">
        <Play size={24} /> צור חדר · יחידה {unit + 1}
      </button>
    </div>
  );
};

// ── Pre-battle flash ──────────────────────────────────────────────────
const PreBattleFlash = ({ questions, onDone }) => {
  const [countdown, setCountdown] = useState(FLASH_SECONDS);
  // Use ref to avoid re-triggering the interval when onDone re-creates
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); onDoneRef.current(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []); // run once

  const progress = (countdown / FLASH_SECONDS) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-6 space-y-4">
      {/* Header */}
      <div className="text-center">
        <p className="text-slate-400 text-sm mb-1">זכור את המילים — הקרב מתחיל בעוד</p>
        <div className={`text-7xl font-black transition-colors ${countdown <= 3 ? 'text-red-400' : 'text-white'}`}>
          {countdown}
        </div>
      </div>

      {/* Countdown bar */}
      <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Word list */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-slate-800 flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">מילות הקרב</span>
          <span className="text-xs text-slate-600">({questions.length} מילים)</span>
        </div>
        <div className="divide-y divide-slate-800/50">
          {questions.map((q, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-slate-600 text-xs font-mono w-5 flex-shrink-0 text-left">{i + 1}</span>
              <span dir="ltr" className="font-black text-white text-sm flex-1">{q.word}</span>
              <span className="text-slate-400 text-sm">{q.translation}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Lobby ─────────────────────────────────────────────────────────────
const Lobby = ({ room, players, myPlayerId, isAdmin, onStart, onCopy, copied }) => (
  <div className="w-full max-w-2xl mx-auto px-4 pt-6 space-y-5">
    <div className="text-center">
      <p className="text-slate-400 text-sm mb-2">קוד החדר</p>
      <div className="flex items-center justify-center gap-3">
        <span dir="ltr" className="font-mono font-black text-4xl text-white tracking-widest">{room.id}</span>
        <button onClick={onCopy}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition active:scale-90">
          {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
        </button>
      </div>
      <p className="text-slate-500 text-xs mt-2">שתף את הקוד עם חברים</p>
    </div>

    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-2">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
        שחקנים ({players.length})
      </p>
      {players.map(p => (
        <div key={p.id} className="flex items-center gap-3 py-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-sm">
            {p.is_bot ? '🤖' : '👤'}
          </div>
          <span className={`flex-1 font-bold ${p.id === myPlayerId ? 'text-blue-300' : 'text-white'}`}>
            {p.name} {p.id === myPlayerId ? '(אתה)' : ''}
          </span>
          {p.is_admin && <Crown size={14} className="text-yellow-400" />}
        </div>
      ))}
    </div>

    <div className="flex gap-3 text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-xl p-3">
      <span>יחידה {(room.word_unit ?? 0) + 1}</span>
      <span>·</span>
      <span>{room.questions?.length ?? 10} שאלות</span>
      <span>·</span>
      <span>{(room.question_time_ms ?? 12000) / 1000}s לשאלה</span>
    </div>

    {isAdmin ? (
      <button onClick={onStart} disabled={players.length < 1}
        className="w-full py-5 bg-green-600 hover:bg-green-500 disabled:opacity-40 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition active:scale-95">
        <Play size={24} /> התחל קרב!
      </button>
    ) : (
      <p className="text-center text-slate-400 font-bold animate-pulse">ממתין שהמנהל יתחיל...</p>
    )}
  </div>
);

// ── Game screen ───────────────────────────────────────────────────────
const GameScreen = ({ question, qIndex, total, players, myPlayerId, timeLeft, questionTimeSec, onAnswer, answered }) => (
  <div className="w-full max-w-2xl mx-auto px-4 pt-4 space-y-4">
    {/* Scoreboard */}
    <div className="flex gap-2 overflow-x-auto pb-1">
      {[...players].sort((a, b) => b.score - a.score).map((p, rank) => (
        <div key={p.id}
          className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-sm
            ${p.id === myPlayerId ? 'bg-blue-900/30 border-blue-700/50' : 'bg-slate-900 border-slate-800'}`}>
          <span>{rank === 0 ? '👑' : `${rank + 1}.`}</span>
          <span className={`font-bold truncate max-w-[80px] ${p.id === myPlayerId ? 'text-blue-300' : 'text-white'}`}>
            {p.is_bot ? '🤖' : ''}{p.name}
          </span>
          <span className="font-black text-blue-400">{p.score}</span>
        </div>
      ))}
    </div>

    {/* Timer */}
    <div className="flex items-center justify-between">
      <span className="text-slate-400 font-bold">{qIndex + 1} / {total}</span>
      <div className="flex items-center gap-2">
        <Clock size={16} className={timeLeft <= 3 ? 'text-red-400' : 'text-slate-400'} />
        <span className={`font-black text-lg ${timeLeft <= 3 ? 'text-red-400' : 'text-slate-300'}`}>{timeLeft}s</span>
      </div>
    </div>
    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full transition-all duration-1000"
        style={{ width: `${(timeLeft / questionTimeSec) * 100}%` }}
      />
    </div>

    {/* Question */}
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-8 text-center">
      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">מה התרגום?</p>
      <p dir="ltr" className="text-5xl font-black text-white tracking-tight break-all">{question.word}</p>
    </div>

    {/* Options */}
    <div className="grid grid-cols-1 gap-3">
      {question.options.map((option, i) => {
        let style = 'bg-slate-800/80 border-slate-700 hover:border-blue-400 hover:bg-slate-700';
        if (answered) {
          if (option === question.translation)
            style = 'bg-green-900/40 border-green-500 text-green-300';
          else if (option === answered && option !== question.translation)
            style = 'bg-red-900/60 border-red-500 text-red-300';
          else
            style = 'bg-slate-800/40 border-slate-700/40 opacity-40';
        }
        return (
          <button key={i} onClick={() => !answered && onAnswer(option)} disabled={!!answered}
            className={`w-full py-4 px-5 rounded-2xl border-2 font-bold text-right transition-all flex items-center justify-between gap-4 ${style}`}>
            <span className="text-lg">{option}</span>
            {answered && option === question.translation && <CheckCircle2 size={22} className="text-green-400 flex-shrink-0" />}
            {answered && option === answered && option !== question.translation && <XCircle size={22} className="text-red-400 flex-shrink-0" />}
          </button>
        );
      })}
    </div>
  </div>
);

// ── Results ───────────────────────────────────────────────────────────
const ResultsScreen = ({ players, myPlayerId, onRematch, onLeave }) => {
  const sorted  = [...players].sort((a, b) => b.score - a.score);
  const winner  = sorted[0];
  const iWon    = winner?.id === myPlayerId;
  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-6 space-y-5">
      <div className="text-center">
        <Crown size={40} className="text-yellow-400 mx-auto mb-2" />
        <h2 className="font-black text-2xl text-white">{winner?.name} ניצח!</h2>
        {iWon && <p className="text-yellow-400 font-bold mt-1">🎉 כל הכבוד — ניצחת!</p>}
      </div>

      <div className="space-y-2">
        {sorted.map((p, rank) => (
          <div key={p.id}
            className={`rounded-2xl p-4 border flex items-center gap-4
              ${p.id === myPlayerId ? 'bg-blue-900/20 border-blue-700/40' : 'bg-slate-900 border-slate-800'}`}>
            <span className="text-2xl">{['🥇','🥈','🥉'][rank] ?? `${rank + 1}.`}</span>
            <span className={`flex-1 font-black text-lg ${p.id === myPlayerId ? 'text-blue-300' : 'text-white'}`}>
              {p.is_bot ? '🤖 ' : ''}{p.name}
            </span>
            <div className="flex items-center gap-1">
              <Zap size={16} className="text-yellow-400" />
              <span className="font-black text-yellow-300 text-xl">{p.score}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onLeave}
          className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold transition flex items-center justify-center gap-2">
          <LogIn size={18} /> יציאה
        </button>
        <button onClick={onRematch}
          className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold transition flex items-center justify-center gap-2">
          <RefreshCw size={18} /> שוב!
        </button>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────
const BattlePage = () => {
  const location = useLocation();
  const { awardXP, supabaseUser } = useVocab();

  const [screen, setScreen]         = useState('landing');
  const [room, setRoom]             = useState(null);
  const [players, setPlayers]       = useState([]);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [isAdmin, setIsAdmin]       = useState(false);
  const [isBotMode, setIsBotMode]   = useState(false);
  const [copied, setCopied]         = useState(false);
  const [error, setError]           = useState(null);

  // Game state
  const [qIndex, setQIndex]       = useState(0);
  const [answered, setAnswered]   = useState(null);
  const [timeLeft, setTimeLeft]   = useState(12);
  const [showStars, setShowStars] = useState(false);
  const [showAlarm, setShowAlarm] = useState(false);

  const questions       = room?.questions ?? [];
  const currentQ        = questions[qIndex] ?? null;
  const questionTimeSec = (room?.question_time_ms ?? 12000) / 1000;

  const timerRef    = useRef(null);
  const channelRef  = useRef(null);

  // Reset on nav-tab re-tap
  useEffect(() => { handleLeave(); }, [location.key]); // eslint-disable-line

  // Cleanup on unmount
  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (channelRef.current) supabase?.removeChannel(channelRef.current);
  }, []);

  // ── Realtime ─────────────────────────────────────────────────────
  const subscribeToRoom = useCallback((roomId) => {
    if (!isSupabaseReady) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase
      .channel(`battle_${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_rooms', filter: `id=eq.${roomId}` },
        ({ new: updated }) => {
          if (!updated) return;
          if (updated.status === 'playing')  startFlash(updated);
          if (updated.status === 'finished') setScreen('results');
          setRoom(prev => ({ ...prev, ...updated }));
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_players', filter: `room_id=eq.${roomId}` },
        () => refreshPlayers(roomId)
      )
      .subscribe();
    channelRef.current = ch;
  }, []); // eslint-disable-line

  const refreshPlayers = async (roomId) => {
    const { data } = await supabase.from('battle_players').select('*').eq('room_id', roomId);
    if (data) setPlayers(data);
  };

  // ── Create room ──────────────────────────────────────────────────
  const handleCreateRoom = () => setScreen('unit');

  const handleStartRoom = async (unitIndex, timeSec, qCount) => {
    if (!isSupabaseReady) { handleVsBot(unitIndex, timeSec, qCount); return; }

    const code   = genCode();
    const qs     = pickQuestions(unitIndex, qCount);
    const myName = getPlayerName();
    const timeMs = timeSec * 1000;

    const { error: rErr } = await supabase.from('battle_rooms').insert({
      id: code, status: 'waiting', word_unit: unitIndex, questions: qs,
      admin_name: myName, question_time_ms: timeMs,
      creator_id: supabaseUser?.id ?? null,   // RLS: only creator can update/start
    });
    if (rErr) { setError(rErr.message); return; }

    const { data: player, error: pErr } = await supabase
      .from('battle_players').insert({
        room_id: code, name: myName, score: 0, is_admin: true,
        user_id: supabaseUser?.id ?? null,     // RLS: player can only update own score
      })
      .select().single();
    if (pErr) { setError(pErr.message); return; }

    setRoom({ id: code, status: 'waiting', word_unit: unitIndex, questions: qs, question_time_ms: timeMs });
    setMyPlayerId(player.id);
    setIsAdmin(true);
    setPlayers([player]);
    subscribeToRoom(code);
    setScreen('lobby');
  };

  // ── Join room ────────────────────────────────────────────────────
  const handleJoinRoom = async (code) => {
    if (!isSupabaseReady) { setError('דרוש Supabase להצטרפות לחדרים'); return; }
    const { data: roomData, error: rErr } = await supabase
      .from('battle_rooms').select('*').eq('id', code).single();
    if (rErr || !roomData) { setError('חדר לא נמצא — בדוק את הקוד'); return; }

    const myName = getPlayerName();
    const { data: player, error: pErr } = await supabase
      .from('battle_players').insert({
        room_id: code, name: myName, score: 0, is_admin: false,
        user_id: supabaseUser?.id ?? null,     // RLS: player can only update own score
      })
      .select().single();
    if (pErr) { setError(pErr.message); return; }

    setRoom(roomData);
    setMyPlayerId(player.id);
    setIsAdmin(false);
    subscribeToRoom(code);
    await refreshPlayers(code);
    setScreen('lobby');
  };

  // ── Admin starts game ────────────────────────────────────────────
  const handleAdminStart = async () => {
    if (!isSupabaseReady) return;
    await supabase.from('battle_rooms').update({ status: 'playing' }).eq('id', room.id);
  };

  // ── Flash → Game transition ──────────────────────────────────────
  const startFlash = (roomData) => {
    setRoom(prev => ({ ...prev, ...roomData }));
    setScreen('flash');
  };

  // Called by PreBattleFlash after 10s countdown
  const onFlashDone = useCallback(() => {
    setQIndex(0);
    setAnswered(null);
    setScreen('game');
    startTimer(0, room);
  }, [room]); // eslint-disable-line

  // ── Timer ────────────────────────────────────────────────────────
  const startTimer = useCallback((qIdx, roomData) => {
    clearInterval(timerRef.current);
    const timeS = (roomData?.question_time_ms ?? 12000) / 1000;
    setTimeLeft(timeS);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          advanceQuestion(qIdx, roomData);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []); // eslint-disable-line

  const advanceQuestion = useCallback((qIdx, roomData) => {
    const qs = roomData?.questions ?? questions;
    if (qIdx + 1 >= qs.length) {
      endGame(roomData);
    } else {
      setQIndex(qIdx + 1);
      setAnswered(null);
      startTimer(qIdx + 1, roomData);
    }
  }, [questions, startTimer]); // eslint-disable-line

  const endGame = async (roomData) => {
    clearInterval(timerRef.current);
    if (isSupabaseReady && (roomData?.id ?? room?.id)) {
      await supabase.from('battle_rooms').update({ status: 'finished' }).eq('id', roomData?.id ?? room.id);
    }
    setPlayers(prev => {
      const myScore = prev.find(p => p.id === myPlayerId)?.score ?? 0;
      if (myScore > 0) awardXP(myScore);
      return prev;
    });
    setScreen('results');
  };

  // ── Answer ───────────────────────────────────────────────────────
  const handleAnswer = async (option) => {
    if (answered || !currentQ) return;
    setAnswered(option);
    clearInterval(timerRef.current);

    const isCorrect = option === currentQ.translation;
    const points    = isCorrect ? (timeLeft >= Math.ceil(questionTimeSec * 0.8) ? 15 : 10) : 0;

    if (isCorrect) {
      setShowStars(true);
      setTimeout(() => setShowStars(false), 1400);
    } else {
      setShowAlarm(true);
      setTimeout(() => setShowAlarm(false), 1100);
    }

    if (isCorrect && myPlayerId && isSupabaseReady) {
      await supabase.from('battle_players')
        .update({ score: (players.find(p => p.id === myPlayerId)?.score ?? 0) + points })
        .eq('id', myPlayerId);
    }
    if (isCorrect) {
      setPlayers(prev => prev.map(p => p.id === myPlayerId ? { ...p, score: p.score + points } : p));
    }

    setTimeout(() => advanceQuestion(qIndex, room), 1500);
  };

  // ── Bot mode ─────────────────────────────────────────────────────
  const handleVsBot = (unitIndex = 0, timeSec = 12, qCount = 10) => {
    const qs     = pickQuestions(unitIndex, qCount);
    const myName = getPlayerName();
    const timeMs = timeSec * 1000;
    const fakeRoom = { id: 'BOT', status: 'playing', word_unit: unitIndex, questions: qs, question_time_ms: timeMs };
    const me       = { id: 'me',  name: myName,  score: 0, is_bot: false, is_admin: true  };
    const bot      = { id: 'bot', name: BOT_NAME, score: 0, is_bot: true,  is_admin: false };
    setRoom(fakeRoom);
    setPlayers([me, bot]);
    setMyPlayerId('me');
    setIsBotMode(true);
    setQIndex(0);
    setAnswered(null);
    setTimeLeft(timeSec);
    setScreen('flash'); // goes through pre-battle flash even in bot mode
  };

  const onBotAnswer = useCallback((option) => {
    if (!isBotMode || answered) return;
    const q = (room?.questions ?? [])[qIndex];
    if (!q) return;
    const correct = option === q.translation;
    if (correct) setPlayers(prev => prev.map(p => p.id === 'bot' ? { ...p, score: p.score + 10 } : p));
  }, [isBotMode, answered, room, qIndex]);

  useBotOpponent(isBotMode && screen === 'game' && !answered ? currentQ : null, onBotAnswer);

  // ── Copy ─────────────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard?.writeText(room?.id ?? '').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Leave ─────────────────────────────────────────────────────────
  const handleLeave = () => {
    clearInterval(timerRef.current);
    if (channelRef.current) { supabase?.removeChannel(channelRef.current); channelRef.current = null; }
    setScreen('landing');
    setRoom(null);
    setPlayers([]);
    setMyPlayerId(null);
    setIsAdmin(false);
    setIsBotMode(false);
    setAnswered(null);
    setQIndex(0);
    setError(null);
    setShowStars(false);
    setShowAlarm(false);
  };

  // ── Render ────────────────────────────────────────────────────────
  if (error) return (
    <div className="flex flex-col items-center justify-center h-[60vh] px-6 text-center gap-4">
      <AlertTriangle size={48} className="text-red-400 opacity-60" />
      <p className="text-red-400 font-bold">{error}</p>
      <button onClick={() => { setError(null); setScreen('landing'); }}
        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition">
        חזרה
      </button>
    </div>
  );

  return (
    <>
      <BattleStyles />
      <StarBurst active={showStars} />
      <AlarmOverlay active={showAlarm} />

      {screen === 'landing' && (
        <Landing onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} onVsBot={() => handleVsBot(0, 12, 10)} />
      )}
      {screen === 'unit' && (
        <UnitSelector onStart={handleStartRoom} />
      )}
      {screen === 'lobby' && (
        <Lobby room={room} players={players} myPlayerId={myPlayerId} isAdmin={isAdmin}
          onStart={handleAdminStart} onCopy={handleCopy} copied={copied} />
      )}
      {screen === 'flash' && (
        <PreBattleFlash questions={questions} onDone={onFlashDone} />
      )}
      {screen === 'results' && (
        <ResultsScreen players={players} myPlayerId={myPlayerId} onRematch={handleLeave} onLeave={handleLeave} />
      )}
      {screen === 'game' && currentQ && (
        <GameScreen
          question={currentQ} qIndex={qIndex} total={questions.length}
          players={players} myPlayerId={myPlayerId}
          timeLeft={timeLeft} questionTimeSec={questionTimeSec}
          onAnswer={handleAnswer} answered={answered}
        />
      )}
    </>
  );
};

export default BattlePage;

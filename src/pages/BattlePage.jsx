import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Swords, Bot, Users, Copy, Check, Play, Crown,
  Zap, CheckCircle2, XCircle, Clock, LogIn, RefreshCw
} from 'lucide-react';
import { supabase, isSupabaseReady } from '../services/supabaseClient';
import { useVocab } from '../context/VocabContext';
import rawData from '../data/academicDB.json';

// ==========================================
// BattlePage — Real-time multiplayer word battle
//
// Modes:
//   • Create Room — host picks a word unit, share 6-char code
//   • Join Room   — enter a friend's code
//   • vs Bot      — solo practice against an AI opponent
//
// Architecture (Supabase Realtime):
//   • battle_rooms  table — room state (status, word_unit, questions)
//   • battle_players table — per-player score
//   • Realtime Postgres Changes subscriptions for live updates
//
// SQL schema is in src/services/supabaseClient.js (battle section).
// ==========================================

const ALL_WORDS   = [...rawData].sort((a, b) => a.word.localeCompare(b.word));
const UNIT_SIZE   = 50;
const TOTAL_UNITS = Math.ceil(ALL_WORDS.length / UNIT_SIZE);
const QUESTIONS_PER_GAME = 10;
const QUESTION_TIME_MS   = 12000; // 12 s per question

// ── helpers ──────────────────────────────────────────────────────────
const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const pickQuestions = (unitIndex) => {
  const unitWords = ALL_WORDS.slice(unitIndex * UNIT_SIZE, (unitIndex + 1) * UNIT_SIZE)
    .filter(w => w.translation);
  const picked = unitWords.sort(() => 0.5 - Math.random()).slice(0, QUESTIONS_PER_GAME);
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

// ── Sub-components ───────────────────────────────────────────────────
const ScoreBadge = ({ score, color = 'text-blue-400' }) => (
  <span className={`font-black text-2xl ${color}`}>{score}</span>
);

// ── Bot logic ─────────────────────────────────────────────────────────
const BOT_NAME         = '🤖 AmirBot';
const BOT_CORRECT_RATE = 0.65;
const useBotOpponent   = (question, onBotAnswer) => {
  const timerRef = useRef(null);
  useEffect(() => {
    if (!question) return;
    clearTimeout(timerRef.current);
    // Bot answers between 3–10 seconds, sometimes wrong
    const delay    = 3000 + Math.random() * 7000;
    const correct  = Math.random() < BOT_CORRECT_RATE;
    const answer   = correct
      ? question.translation
      : question.options.find(o => o !== question.translation) ?? question.options[0];
    timerRef.current = setTimeout(() => onBotAnswer(answer), delay);
    return () => clearTimeout(timerRef.current);
  }, [question, onBotAnswer]);
};

// ── Landing screen ────────────────────────────────────────────────────
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

      {/* Create Room */}
      <button
        onClick={onCreateRoom}
        className="w-full p-5 rounded-2xl border-2 border-blue-700/50 bg-blue-900/20 hover:bg-blue-900/30 flex items-center gap-4 text-right transition-all active:scale-[0.98]"
      >
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
          <Users size={24} className="text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="font-black text-lg text-white">צור חדר</p>
          <p className="text-slate-400 text-sm">שתף קוד עם חברים (עד 10 שחקנים)</p>
        </div>
      </button>

      {/* Join Room */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-3">
        <p className="text-sm font-bold text-slate-400">הצטרף לחדר</p>
        <div className="flex gap-2">
          <input
            type="text"
            dir="ltr"
            placeholder="קוד 6 ספרות"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
            onKeyDown={e => e.key === 'Enter' && code.length === 6 && onJoinRoom(code)}
            className="flex-1 bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-xl py-3 px-4 text-white text-center font-mono text-lg outline-none tracking-widest uppercase placeholder:text-slate-600 placeholder:text-sm placeholder:tracking-normal placeholder:font-sans"
          />
          <button
            onClick={() => onJoinRoom(code)}
            disabled={code.length !== 6}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 rounded-xl font-black transition active:scale-95"
          >
            הצטרף
          </button>
        </div>
      </div>

      {/* vs Bot */}
      <button
        onClick={onVsBot}
        className="w-full p-5 rounded-2xl border-2 border-slate-700 bg-slate-900 hover:border-slate-600 flex items-center gap-4 text-right transition-all active:scale-[0.98]"
      >
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

// ── Unit selector for room creation ──────────────────────────────────
const UnitSelector = ({ onStart }) => {
  const [unit, setUnit] = useState(0);
  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-6 space-y-5">
      <h2 className="font-black text-xl text-white text-center">בחר יחידת מילים</h2>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: TOTAL_UNITS }, (_, i) => (
          <button key={i} onClick={() => setUnit(i)}
            className={`py-3 rounded-xl font-black transition active:scale-90 text-sm
              ${i === unit ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
            יחידה {i + 1}
          </button>
        ))}
      </div>
      <button
        onClick={() => onStart(unit)}
        className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition active:scale-95"
      >
        <Play size={24} /> צור חדר עם יחידה {unit + 1}
      </button>
    </div>
  );
};

// ── Lobby — waiting room ──────────────────────────────────────────────
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

    <p className="text-slate-500 text-xs text-center">
      יחידה {(room.word_unit ?? 0) + 1} · {QUESTIONS_PER_GAME} שאלות · {QUESTION_TIME_MS / 1000} שניות לשאלה
    </p>

    {isAdmin ? (
      <button
        onClick={onStart}
        disabled={players.length < 1}
        className="w-full py-5 bg-green-600 hover:bg-green-500 disabled:opacity-40 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition active:scale-95"
      >
        <Play size={24} /> התחל קרב!
      </button>
    ) : (
      <p className="text-center text-slate-400 font-bold animate-pulse">ממתין שהמנהל יתחיל...</p>
    )}
  </div>
);

// ── In-game question screen ───────────────────────────────────────────
const GameScreen = ({ question, qIndex, total, players, myPlayerId, timeLeft, onAnswer, answered }) => {
  const me = players.find(p => p.id === myPlayerId);

  return (
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

      {/* Progress + Timer */}
      <div className="flex items-center justify-between">
        <span className="text-slate-400 font-bold">{qIndex + 1} / {total}</span>
        <div className="flex items-center gap-2">
          <Clock size={16} className={timeLeft <= 3 ? 'text-red-400' : 'text-slate-400'} />
          <span className={`font-black text-lg ${timeLeft <= 3 ? 'text-red-400' : 'text-slate-300'}`}>
            {timeLeft}s
          </span>
        </div>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full transition-all duration-1000"
          style={{ width: `${(timeLeft / (QUESTION_TIME_MS / 1000)) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-8 text-center">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">מה התרגום?</p>
        <p dir="ltr" className="text-5xl font-black text-white tracking-tight">{question.word}</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-3">
        {question.options.map((option, i) => {
          let style = 'bg-slate-800/80 border-slate-700 hover:border-blue-400 hover:bg-slate-700';
          if (answered) {
            if (option === question.translation) style = 'bg-green-900/40 border-green-500 text-green-300';
            else if (option === answered && option !== question.translation) style = 'bg-red-900/40 border-red-500 text-red-300';
            else style = 'bg-slate-800/40 border-slate-700/40 opacity-40';
          }
          return (
            <button key={i} onClick={() => !answered && onAnswer(option)}
              disabled={!!answered}
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
};

// ── Final results ─────────────────────────────────────────────────────
const ResultsScreen = ({ players, myPlayerId, onRematch, onLeave }) => {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-6 space-y-5">
      <div className="text-center">
        <Crown size={40} className="text-yellow-400 mx-auto mb-2" />
        <h2 className="font-black text-2xl text-white">{winner?.name} ניצח!</h2>
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
  const { awardXP } = useVocab();

  const [screen, setScreen]         = useState('landing'); // landing | unit | lobby | game | results
  const [room, setRoom]             = useState(null);
  const [players, setPlayers]       = useState([]);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [isAdmin, setIsAdmin]       = useState(false);
  const [isBotMode, setIsBotMode]   = useState(false);
  const [copied, setCopied]         = useState(false);
  const [error, setError]           = useState(null);

  // Game state
  const [qIndex, setQIndex]       = useState(0);
  const [answered, setAnswered]   = useState(null); // chosen option
  const [timeLeft, setTimeLeft]   = useState(QUESTION_TIME_MS / 1000);
  const questions                 = room?.questions ?? [];
  const currentQ                  = questions[qIndex] ?? null;
  const timerRef                  = useRef(null);
  const channelRef                = useRef(null);

  // Reset on nav-tab re-tap
  useEffect(() => {
    handleLeave();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // ── Cleanup on unmount ──────────────────────────────────────────
  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (channelRef.current) supabase?.removeChannel(channelRef.current);
  }, []);

  // ── Supabase subscriptions ──────────────────────────────────────
  const subscribeToRoom = useCallback((roomId) => {
    if (!isSupabaseReady) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const ch = supabase
      .channel(`battle_${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_rooms', filter: `id=eq.${roomId}` },
        ({ new: updated }) => {
          if (!updated) return;
          if (updated.status === 'playing') startGame(updated);
          if (updated.status === 'finished') setScreen('results');
          setRoom(prev => ({ ...prev, ...updated }));
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_players', filter: `room_id=eq.${roomId}` },
        () => refreshPlayers(roomId)
      )
      .subscribe();

    channelRef.current = ch;
  }, []);

  const refreshPlayers = async (roomId) => {
    const { data } = await supabase.from('battle_players').select('*').eq('room_id', roomId);
    if (data) setPlayers(data);
  };

  // ── Create room ─────────────────────────────────────────────────
  const handleCreateRoom = () => setScreen('unit');

  const handleStartRoom = async (unitIndex) => {
    if (!isSupabaseReady) {
      // Offline bot mode with selected unit
      handleVsBot(unitIndex);
      return;
    }
    const code      = genCode();
    const qs        = pickQuestions(unitIndex);
    const myName    = getPlayerName();

    const { error: rErr } = await supabase.from('battle_rooms').insert({
      id: code, status: 'waiting', word_unit: unitIndex, questions: qs, admin_name: myName,
    });
    if (rErr) { setError(rErr.message); return; }

    const { data: player, error: pErr } = await supabase.from('battle_players').insert({
      room_id: code, name: myName, score: 0, is_admin: true,
    }).select().single();
    if (pErr) { setError(pErr.message); return; }

    setRoom({ id: code, status: 'waiting', word_unit: unitIndex, questions: qs });
    setMyPlayerId(player.id);
    setIsAdmin(true);
    setPlayers([player]);
    subscribeToRoom(code);
    setScreen('lobby');
  };

  // ── Join room ───────────────────────────────────────────────────
  const handleJoinRoom = async (code) => {
    if (!isSupabaseReady) { setError('דרוש Supabase להצטרפות לחדרים'); return; }
    const { data: roomData, error: rErr } = await supabase
      .from('battle_rooms').select('*').eq('id', code).single();
    if (rErr || !roomData) { setError('חדר לא נמצא — בדוק את הקוד'); return; }

    const myName = getPlayerName();
    const { data: player, error: pErr } = await supabase.from('battle_players').insert({
      room_id: code, name: myName, score: 0, is_admin: false,
    }).select().single();
    if (pErr) { setError(pErr.message); return; }

    setRoom(roomData);
    setMyPlayerId(player.id);
    setIsAdmin(false);
    subscribeToRoom(code);
    await refreshPlayers(code);
    setScreen('lobby');
  };

  // ── Start game (admin triggers) ─────────────────────────────────
  const handleAdminStart = async () => {
    if (!isSupabaseReady) return;
    await supabase.from('battle_rooms').update({ status: 'playing' }).eq('id', room.id);
  };

  const startGame = (updatedRoom) => {
    setRoom(prev => ({ ...prev, ...updatedRoom }));
    setQIndex(0);
    setAnswered(null);
    setTimeLeft(QUESTION_TIME_MS / 1000);
    setScreen('game');
    startTimer(0, updatedRoom);
  };

  // ── Timer ───────────────────────────────────────────────────────
  const startTimer = useCallback((qIdx, roomData) => {
    clearInterval(timerRef.current);
    setTimeLeft(QUESTION_TIME_MS / 1000);
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
  }, []);

  const advanceQuestion = useCallback((qIdx, roomData) => {
    const qs = roomData?.questions ?? questions;
    if (qIdx + 1 >= qs.length) {
      endGame(roomData);
    } else {
      setQIndex(qIdx + 1);
      setAnswered(null);
      startTimer(qIdx + 1, roomData);
    }
  }, [questions, startTimer]);

  const endGame = async (roomData) => {
    clearInterval(timerRef.current);
    if (isSupabaseReady && (roomData?.id ?? room?.id)) {
      await supabase.from('battle_rooms').update({ status: 'finished' }).eq('id', roomData?.id ?? room.id);
    }
    // Award XP to the leaderboard profile: use the player's final battle score
    setPlayers(prev => {
      const myScore = prev.find(p => p.id === myPlayerId)?.score ?? 0;
      if (myScore > 0) awardXP(myScore);
      return prev;
    });
    setScreen('results');
  };

  // ── Answer ──────────────────────────────────────────────────────
  const handleAnswer = async (option) => {
    if (answered || !currentQ) return;
    setAnswered(option);
    clearInterval(timerRef.current);

    const isCorrect = option === currentQ.translation;
    const points    = isCorrect ? (timeLeft >= 10 ? 15 : 10) : 0; // speed bonus

    if (isCorrect && myPlayerId && isSupabaseReady) {
      await supabase.from('battle_players').update({ score: (players.find(p => p.id === myPlayerId)?.score ?? 0) + points })
        .eq('id', myPlayerId);
    }
    // Also update local state immediately
    if (isCorrect) {
      setPlayers(prev => prev.map(p => p.id === myPlayerId ? { ...p, score: p.score + points } : p));
    }

    // Advance after 1.5s
    setTimeout(() => advanceQuestion(qIndex, room), 1500);
  };

  // ── Bot mode ────────────────────────────────────────────────────
  const [botScore, setBotScore] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);

  const handleVsBot = (unitIndex = 0) => {
    const qs = pickQuestions(unitIndex);
    const myName = getPlayerName();
    const fakeRoom = { id: 'BOT', status: 'playing', word_unit: unitIndex, questions: qs };
    const me  = { id: 'me',  name: myName,  score: 0, is_bot: false, is_admin: true };
    const bot = { id: 'bot', name: BOT_NAME, score: 0, is_bot: true, is_admin: false };
    setRoom(fakeRoom);
    setPlayers([me, bot]);
    setMyPlayerId('me');
    setIsBotMode(true);
    setBotScore(0);
    setPlayerScore(0);
    setQIndex(0);
    setAnswered(null);
    setTimeLeft(QUESTION_TIME_MS / 1000);
    setScreen('game');
    startTimer(0, fakeRoom);
  };

  // Bot opponent effect
  const onBotAnswer = useCallback((option) => {
    if (!isBotMode || answered) return;
    const currentQuestion = (room?.questions ?? [])[qIndex];
    if (!currentQuestion) return;
    const correct = option === currentQuestion.translation;
    if (correct) {
      setBotScore(s => s + 10);
      setPlayers(prev => prev.map(p => p.id === 'bot' ? { ...p, score: p.score + 10 } : p));
    }
  }, [isBotMode, answered, room, qIndex]);

  useBotOpponent(isBotMode && !answered ? currentQ : null, onBotAnswer);

  // ── Copy room code ───────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard?.writeText(room?.id ?? '').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Leave / reset ────────────────────────────────────────────────
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
  };

  // ── Render ───────────────────────────────────────────────────────
  if (error) return (
    <div className="flex flex-col items-center justify-center h-[60vh] px-6 text-center gap-4">
      <XCircle size={48} className="text-red-400 opacity-60" />
      <p className="text-red-400 font-bold">{error}</p>
      <button onClick={() => { setError(null); setScreen('landing'); }}
        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition">
        חזרה
      </button>
    </div>
  );

  if (screen === 'landing')  return <Landing onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} onVsBot={() => handleVsBot(0)} />;
  if (screen === 'unit')     return <UnitSelector onStart={handleStartRoom} />;
  if (screen === 'lobby')    return <Lobby room={room} players={players} myPlayerId={myPlayerId} isAdmin={isAdmin} onStart={handleAdminStart} onCopy={handleCopy} copied={copied} />;
  if (screen === 'results')  return <ResultsScreen players={players} myPlayerId={myPlayerId} onRematch={handleLeave} onLeave={handleLeave} />;

  if (screen === 'game' && currentQ) return (
    <GameScreen
      question={currentQ}
      qIndex={qIndex}
      total={questions.length}
      players={players}
      myPlayerId={myPlayerId}
      timeLeft={timeLeft}
      onAnswer={handleAnswer}
      answered={answered}
    />
  );

  return null;
};

export default BattlePage;

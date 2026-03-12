import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Mic, MicOff, Send, Tv, Folder, ChevronLeft, X, Award } from 'lucide-react';
import { useVocab } from '../context/VocabContext';
import { useTimer } from '../hooks/useTimer';
import { formatTime } from '../utils/formatTime';
import { extractKeyword, analyzeWord, spellCheck } from '../utils/wordAnalyzer';
import WordCard from '../components/WordCard';
import EpisodeModal from '../components/EpisodeModal';

// ==========================================
// WatchPage — live TV-watching screen
//
// Requirement 1: Episode picker defaults to S1 E1 (no typing)
// Requirement 2: Timer auto-starts the moment episode is confirmed
// Requirement 3: Voice input extracts a single keyword from transcript
// Requirement 4: useEffect watches `episodeStatus` to trigger auto-start
// ==========================================

const SHOWS = [
  'How I Met Your Mother',
  'Friends',
  'The Office',
  'Suits',
  'Breaking Bad',
  'The Bear',
];

// Tracks whether this session was *just* started vs. resumed
// 'idle'    — no active episode
// 'active'  — episode was just confirmed this visit → auto-start timer
// 'resumed' — returning to a session that was already in progress → don't auto-start
const STATUS = { IDLE: 'idle', ACTIVE: 'active', RESUMED: 'resumed' };

const WatchPage = () => {
  const navigate = useNavigate();
  const {
    addWord, currentEpisodeWords, reanalyzeWord,
    savedEpisodes, startEpisode,
    selectedShow, selectedEpisode, setSelectedShow, setSelectedEpisode,
    examResults, setExamResults,
  } = useVocab();
  const { seconds, isWatching, toggle, start, pause, reset } = useTimer();

  const [currentInput, setCurrentInput]     = useState('');
  const [isListening, setIsListening]       = useState(false);
  const [pendingShow, setPendingShow]       = useState(null);
  const [spellSuggestion, setSpellSuggestion] = useState(null); // { original, suggestion }
  const [episodeStatus, setEpisodeStatus]   = useState(
    selectedShow && selectedEpisode ? STATUS.RESUMED : STATUS.IDLE
  );
  const inputRef = useRef(null);

  // ── Requirement 4: auto-start via useEffect ───────────────────────
  // When the user confirms a new episode the status flips to 'active'.
  // This effect fires and starts the timer — zero extra clicks required.
  //
  // Why useEffect instead of calling start() directly in the handler?
  //   The handler updates React state (startEpisode sets selectedShow/Episode).
  //   State updates are batched and not reflected until the next render.
  //   useEffect runs *after* the render, so the component has the correct
  //   new state before any side effects happen. This is the React-correct
  //   pattern for "do something after a state change."
  useEffect(() => {
    if (episodeStatus === STATUS.ACTIVE) {
      reset(0);   // reset timer to 0:00
      start();    // start immediately — Requirement 2
      inputRef.current?.focus();
    }
  }, [episodeStatus]);

  const isSessionActive = !!selectedShow && !!selectedEpisode;

  // ── Word Submission ───────────────────────────────────────────────
  const handleSubmit = (text) => {
    const word = (text || currentInput).trim();
    if (!word || !isSessionActive) return;
    setCurrentInput('');

    // Spell check: if word isn't in local DB, suggest correction
    const localResult = analyzeWord(word);
    if (localResult.loading) {
      const suggestion = spellCheck(word);
      if (suggestion) {
        setSpellSuggestion({ original: word, suggestion });
        inputRef.current?.focus();
        return; // hold — wait for user to confirm
      }
    }
    addWord(word, seconds);
    inputRef.current?.focus();
  };

  const handleConfirmSpell = () => {
    addWord(spellSuggestion.suggestion, seconds);
    setSpellSuggestion(null);
    inputRef.current?.focus();
  };

  const handleRejectSpell = () => {
    addWord(spellSuggestion.original, seconds, { invalid: true });
    setSpellSuggestion(null);
    inputRef.current?.focus();
  };

  // ── Requirement 3: Voice → single keyword ─────────────────────────
  // The Speech API returns a full sentence transcript. extractKeyword()
  // scans it against the Amirnet DB to isolate the one intended word.
  const startListening = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const rec = new Recognition();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setIsListening(true);
    rec.onend   = () => setIsListening(false);
    rec.onresult = (e) => {
      const rawTranscript = e.results[0][0].transcript;
      const keyword = extractKeyword(rawTranscript); // Requirement 3 fix
      handleSubmit(keyword);
    };
    rec.onerror = () => setIsListening(false);
    rec.start();
  };

  // ── Requirement 1: Episode confirmed → flip status to 'active' ────
  const handleEpisodeConfirm = (episodeLabel) => {
    startEpisode(pendingShow, episodeLabel);
    setPendingShow(null);
    setEpisodeStatus(STATUS.ACTIVE); // triggers the useEffect above
  };

  const handleEndEpisode = () => {
    pause();
    setEpisodeStatus(STATUS.IDLE);
    navigate('/review');
  };

  const openSavedEpisode = (ep) => {
    setSelectedShow(ep.show);
    setSelectedEpisode(ep.episode);
    navigate('/review');
  };

  // ── HOME: no active session ───────────────────────────────────────
  if (!isSessionActive) {
    const scorePct = examResults
      ? Math.round((examResults.score / examResults.total) * 100) : null;

    return (
      <div className="w-full max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* Score banner after exam */}
        {examResults && (
          <div className={`rounded-3xl p-5 border flex items-center gap-4
            ${scorePct >= 70
              ? 'bg-green-900/25 border-green-700/40'
              : 'bg-amber-900/25 border-amber-700/40'}`}
          >
            <Award size={32} className={scorePct >= 70 ? 'text-yellow-400 flex-shrink-0' : 'text-amber-500 flex-shrink-0'} />
            <div className="flex-1">
              <p className={`text-3xl font-black ${scorePct >= 70 ? 'text-white' : 'text-amber-300'}`}>{scorePct}%</p>
              <p className="text-slate-400 text-sm">{examResults.score} / {examResults.total} נכון במבחן האחרון</p>
            </div>
            <button onClick={() => setExamResults(null)} className="p-2 text-slate-500 hover:text-slate-300">
              <X size={18} />
            </button>
          </div>
        )}

        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
            <Tv className="w-4 h-4" /> בחר תוכנית
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {SHOWS.map(show => (
              <button
                key={show}
                onClick={() => setPendingShow(show)}
                className="p-4 bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 hover:border-blue-500/40 rounded-2xl text-sm font-bold transition-all text-right active:scale-95"
              >
                {show}
              </button>
            ))}
          </div>
        </div>

        {savedEpisodes.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 px-1 text-slate-500">
              <Folder className="w-4 h-4" /> פרקים שמורים
            </h2>
            {savedEpisodes.map((ep, i) => (
              <button
                key={i}
                onClick={() => openSavedEpisode(ep)}
                className="w-full bg-slate-900 hover:bg-slate-800 p-4 rounded-2xl border border-slate-800 hover:border-slate-700 flex justify-between items-center transition-all text-right group"
              >
                <div>
                  <div className="font-black text-base">{ep.show}</div>
                  <div className="text-slate-500 text-sm">{ep.episode}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-blue-900/30 text-blue-400 px-2.5 py-1 rounded-lg text-xs font-bold">
                    {ep.count} מילים
                  </span>
                  <ChevronLeft className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition" />
                </div>
              </button>
            ))}
          </div>
        )}

        {pendingShow && (
          <EpisodeModal
            show={pendingShow}
            onConfirm={handleEpisodeConfirm}
            onCancel={() => setPendingShow(null)}
          />
        )}
      </div>
    );
  }

  // ── SESSION: active episode ───────────────────────────────────────
  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-5 space-y-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800/80 p-6 rounded-3xl border border-slate-700/60 flex flex-col items-center shadow-2xl">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">
          {selectedShow} · {selectedEpisode}
        </div>

        {/* Timer — huge on phone */}
        <div className={`relative mb-7 ${isWatching ? 'drop-shadow-[0_0_32px_rgba(59,130,246,0.5)]' : ''}`}>
          <div className={`text-8xl font-mono font-black tracking-tighter transition-colors
            ${isWatching ? 'text-blue-400' : 'text-slate-500'}`}
          >
            {formatTime(seconds)}
          </div>
          {isWatching && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          )}
        </div>

        {/* Play/Pause + End — big touch targets */}
        <div className="flex gap-4 mb-7 w-full justify-center">
          <button
            onClick={toggle}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-90
              ${isWatching
                ? 'bg-amber-500 shadow-amber-900/50'
                : 'bg-green-600 shadow-green-900/50'}`}
          >
            {isWatching
              ? <Pause fill="white" size={34} />
              : <Play fill="white" size={34} className="mr-1" />
            }
          </button>
          <button
            onClick={handleEndEpisode}
            className="flex-1 max-w-[160px] h-20 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-2xl font-bold border border-slate-700 text-base transition"
          >
            סיום פרק
          </button>
        </div>

        {/* Word Input — tall, easy to tap */}
        <div className="w-full flex gap-2.5">
          <input
            ref={inputRef}
            type="text"
            dir="ltr"
            placeholder="Type a word..."
            className="flex-1 bg-slate-800/80 border-2 border-slate-700 focus:border-blue-500 rounded-2xl py-4 px-5 text-left outline-none transition text-xl placeholder:text-slate-600"
            value={currentInput}
            onChange={e => setCurrentInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!currentInput.trim()}
            className="w-14 h-14 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 rounded-2xl flex items-center justify-center transition active:scale-90 self-center"
          >
            <Send size={22} />
          </button>
          <button
            onClick={startListening}
            disabled={isListening}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition active:scale-90 self-center
              ${isListening ? 'bg-red-600 animate-pulse' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            {isListening ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
        </div>
      </div>

      {/* Spell suggestion banner */}
      {spellSuggestion && (
        <div className="bg-amber-900/30 border border-amber-700/50 rounded-2xl p-4">
          <p className="text-sm text-slate-300 mb-3">
            האם התכוונת ל:{' '}
            <span dir="ltr" className="font-black text-white text-base">{spellSuggestion.suggestion}</span>
            {' '}במקום{' '}
            <span dir="ltr" className="text-slate-500 line-through">{spellSuggestion.original}</span>
            {'?'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleConfirmSpell}
              className="flex-1 py-3 bg-green-700 hover:bg-green-600 active:scale-95 rounded-xl font-bold text-sm transition"
            >
              כן, {spellSuggestion.suggestion}
            </button>
            <button
              onClick={handleRejectSpell}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 active:scale-95 rounded-xl font-bold text-sm transition"
            >
              לא, שמור כך
            </button>
          </div>
        </div>
      )}

      {currentEpisodeWords.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">
            {currentEpisodeWords.length} מילים בפרק זה
          </h3>
          {currentEpisodeWords.slice(0, 6).map(w => (
            <WordCard key={w.id} word={w} onReanalyze={reanalyzeWord} />
          ))}
          {currentEpisodeWords.length > 6 && (
            <button
              onClick={() => navigate('/review')}
              className="w-full py-4 text-base text-blue-400 hover:text-blue-300 transition font-bold"
            >
              + {currentEpisodeWords.length - 6} מילים נוספות — לסקירה המלאה ←
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default WatchPage;

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, CheckCircle2, XCircle, HelpCircle, Play, BookOpen, AlertTriangle, Zap } from 'lucide-react';
import { useVocab, WORD_STATUS } from '../context/VocabContext';
import { psychometricDB } from '../data/psychometricDB';
import rawData from '../data/academicDB.json';
import { FALSE_FRIENDS_DB } from '../data/falseFriendsDB';

// ==========================================
// ExamPage — Multiple choice quiz
//
// Three modes:
//   1. Episode exam   — examWords set by ReviewPage (existing flow)
//   2. Folder exam    — built from Unknown / Uncertain word statuses
//   3. False Friends  — Israeli English common mistake quiz
//
// Auto-failure tracking: wrong answer → word auto-marked as Unknown
// XP awarded: +10 per correct answer (Supabase when logged in)
// ==========================================

const LETTERS = ['א', 'ב', 'ג', 'ד'];

// Build fast lookup from academicDB
const DB_MAP = Object.create(null);
for (const e of rawData) DB_MAP[e.word.toLowerCase()] = e;

// Build exam questions from a list of word objects
const buildExamQuestions = (words) => {
  const allTranslations = Object.values(psychometricDB);
  return words.sort(() => 0.5 - Math.random()).map(word => {
    const distractors = allTranslations
      .filter(t => t !== word.translation)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    const options = [...distractors, word.translation].sort(() => 0.5 - Math.random());
    return { ...word, options };
  });
};

// Convert wordStatuses entries to full word objects for the exam
const buildWordsFromStatuses = (wordStatuses, filter) => {
  const targetStatuses =
    filter === 'both'
      ? [WORD_STATUS.UNKNOWN, WORD_STATUS.UNCERTAIN]
      : [filter];

  return Object.entries(wordStatuses)
    .filter(([, s]) => targetStatuses.includes(s))
    .map(([w]) => {
      const entry = DB_MAP[w.toLowerCase()];
      if (entry) return { word: entry.word, translation: entry.translation, pos: entry.pos, level: entry.level, score: 85, inDatabase: true };
      const trans = psychometricDB[w.toLowerCase()];
      if (trans) return { word: w, translation: trans, score: 70, inDatabase: false };
      return null;
    })
    .filter(Boolean);
};

// Build false friends exam questions
const buildFalseFriendsQuestions = () => {
  const allTranslations = Object.values(psychometricDB);
  return FALSE_FRIENDS_DB
    .sort(() => 0.5 - Math.random())
    .map(entry => {
      // Include the false translation as one of the distractors
      const others = allTranslations
        .filter(t => t !== entry.translation && t !== entry.falseTranslation)
        .sort(() => 0.5 - Math.random())
        .slice(0, 2);
      const options = [entry.translation, entry.falseTranslation, ...others]
        .sort(() => 0.5 - Math.random());
      return {
        word:             entry.word,
        translation:      entry.translation,
        falseTranslation: entry.falseTranslation,
        example:          entry.example,
        humor:            entry.humor,
        score:            80,
        options,
        isFalseFriend:    true,
      };
    });
};

// ── Folder Exam Setup screen ─────────────────────────────────────────
const FolderExamSetup = ({ wordStatuses, unknownWords, uncertainWords, onStart, onFalseFriends }) => {
  const [filter, setFilter] = useState('both');

  const availableCount = useMemo(() => {
    if (filter === WORD_STATUS.UNKNOWN)   return unknownWords.length;
    if (filter === WORD_STATUS.UNCERTAIN) return uncertainWords.length;
    return unknownWords.length + uncertainWords.length;
  }, [filter, unknownWords, uncertainWords]);

  const options = [
    { value: 'both',                label: 'שניהם',    icon: BookOpen,    color: 'text-blue-400',   bg: 'bg-blue-900/20 border-blue-700/40',   count: unknownWords.length + uncertainWords.length },
    { value: WORD_STATUS.UNKNOWN,   label: 'לא ידוע',  icon: XCircle,     color: 'text-red-400',    bg: 'bg-red-900/20 border-red-700/40',     count: unknownWords.length },
    { value: WORD_STATUS.UNCERTAIN, label: 'לא בטוח',  icon: HelpCircle,  color: 'text-amber-400',  bg: 'bg-amber-900/20 border-amber-700/40', count: uncertainWords.length },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-6 space-y-5">
      <div className="text-center">
        <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
          <GraduationCap size={30} className="text-indigo-400" />
        </div>
        <h2 className="font-black text-2xl text-white">בחר מבחן</h2>
        <p className="text-slate-400 text-sm mt-1">מבחן מילים, תיקיות, או "חברים כוזבים"</p>
      </div>

      {/* Folder filter */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">מבחן תיקיות</p>
        {options.map(opt => {
          const Icon   = opt.icon;
          const active = filter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 text-right transition-all active:scale-[0.98]
                ${active ? opt.bg + ' border-opacity-100' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
            >
              <Icon size={24} className={active ? opt.color : 'text-slate-500'} />
              <div className="flex-1">
                <p className={`font-black text-base ${active ? 'text-white' : 'text-slate-400'}`}>{opt.label}</p>
              </div>
              <span className={`text-xl font-black ${active ? opt.color : 'text-slate-500'}`}>{opt.count}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onStart(filter)}
        disabled={availableCount < 2}
        className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-blue-900/30 transition active:scale-95"
      >
        <Play size={24} />
        מבחן תיקיות ({availableCount} מילים)
      </button>

      {availableCount < 2 && (
        <p className="text-center text-slate-500 text-sm">
          צריך לפחות 2 מילים — סמן מילים ב✗ או ? באוצר המילים
        </p>
      )}

      {/* False Friends section */}
      <div className="border-t border-slate-800 pt-5 space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">מבחן מיוחד</p>
        <button
          onClick={onFalseFriends}
          className="w-full p-4 rounded-2xl border-2 border-orange-800/40 bg-orange-900/10 hover:bg-orange-900/20 flex items-center gap-4 text-right transition-all active:scale-[0.98]"
        >
          <AlertTriangle size={24} className="text-orange-400 flex-shrink-0" />
          <div className="flex-1 text-right">
            <p className="font-black text-base text-white">חברים כוזבים</p>
            <p className="text-orange-400/70 text-xs mt-0.5">מילים שישראלים מתבלבלים בהן</p>
          </div>
          <span className="text-orange-400 font-black text-xl">{FALSE_FRIENDS_DB.length}</span>
        </button>
      </div>
    </div>
  );
};

// ── Main Exam component ──────────────────────────────────────────────
const ExamPage = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const {
    examWords, setExamWords, setExamResults,
    setSelectedShow, setSelectedEpisode,
    wordStatuses, setWordStatus, unknownWords, uncertainWords,
    awardXP, supabaseUser,
  } = useVocab();

  const [index, setIndex]               = useState(0);
  const [score, setScore]               = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [results, setResults]           = useState([]);
  const [activeExamWords, setActiveExamWords] = useState(null); // null = not started yet
  const [humorToast, setHumorToast]     = useState(null);

  // Reset when examWords change (new episode exam loaded)
  useEffect(() => {
    setIndex(0);
    setScore(0);
    setSelectedOption(null);
    setResults([]);
    setActiveExamWords(null);
  }, [examWords]);

  // Reset to setup screen when user re-taps the Exam nav tab
  useEffect(() => {
    if (!examWords || examWords.length === 0) {
      setActiveExamWords(null);
      setIndex(0);
      setScore(0);
      setSelectedOption(null);
      setResults([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const isEpisodeExam = examWords && examWords.length > 0;

  // Setup screen
  if (!isEpisodeExam && !activeExamWords) {
    return (
      <FolderExamSetup
        wordStatuses={wordStatuses}
        unknownWords={unknownWords}
        uncertainWords={uncertainWords}
        onStart={(filter) => {
          const words = buildWordsFromStatuses(wordStatuses, filter);
          if (words.length < 2) return;
          setActiveExamWords(buildExamQuestions(words));
          setIndex(0); setScore(0); setSelectedOption(null); setResults([]);
        }}
        onFalseFriends={() => {
          setActiveExamWords(buildFalseFriendsQuestions());
          setIndex(0); setScore(0); setSelectedOption(null); setResults([]);
        }}
      />
    );
  }

  const questions = isEpisodeExam ? examWords : activeExamWords;

  if (!questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 text-center px-4">
        <GraduationCap size={56} className="mb-4 opacity-30" />
        <p className="text-xl font-bold text-slate-400">אין מבחן פעיל</p>
        <p className="text-sm mt-2">חזור לסקירה ובחר מילים למבחן</p>
      </div>
    );
  }

  const currentWord = questions[index];
  const total       = questions.length;
  const progress    = (index / total) * 100;
  const isFalseFriendMode = !!currentWord?.isFalseFriend;

  const handleAnswer = (option) => {
    if (selectedOption !== null) return;
    setSelectedOption(option);

    const isCorrect = option === currentWord.translation;
    const newScore  = isCorrect ? score + 1 : score;
    if (isCorrect) setScore(newScore);

    // Auto-mark wrong answer as Unknown (not for false friends mode)
    if (!isCorrect && !isFalseFriendMode) {
      setWordStatus(currentWord.word, WORD_STATUS.UNKNOWN);
    }

    // Show humor toast for false friends wrong answers
    if (!isCorrect && isFalseFriendMode && currentWord.humor) {
      setHumorToast(currentWord.humor);
    }

    const newResults = [...results, { ...currentWord, chosen: option, correct: isCorrect }];
    setResults(newResults);

    setTimeout(() => {
      setHumorToast(null);
      if (index < total - 1) {
        setIndex(i => i + 1);
        setSelectedOption(null);
      } else {
        // ── Award XP ────────────────────────────────────────────────
        const xpEarned = newScore * 10;
        awardXP(xpEarned);

        setExamResults({ score: newScore, total, results: newResults });
        if (isEpisodeExam) {
          setSelectedShow(null);
          setSelectedEpisode('');
          navigate('/watch');
        } else {
          setActiveExamWords(null);
          navigate('/results');
        }
      }
    }, isFalseFriendMode && !isCorrect ? 2500 : 1500);
  };

  const optionStyle = (option) => {
    if (!selectedOption)
      return 'bg-slate-800/80 border-slate-700 hover:border-blue-400 hover:bg-slate-700 active:scale-98';
    if (option === currentWord.translation)
      return 'bg-green-900/40 border-green-500 text-green-300';
    if (option === selectedOption)
      return 'bg-red-900/40 border-red-500 text-red-300';
    return 'bg-slate-800/40 border-slate-700/40 opacity-40';
  };

  const optionIcon = (option) => {
    if (!selectedOption) return null;
    if (option === currentWord.translation) return <CheckCircle2 size={24} className="text-green-400 flex-shrink-0" />;
    if (option === selectedOption)          return <XCircle size={24} className="text-red-400 flex-shrink-0" />;
    return null;
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-5 space-y-5">
      {/* Mode badge */}
      <div className="flex justify-center gap-2">
        {!isEpisodeExam && !isFalseFriendMode && (
          <span className="text-xs bg-indigo-900/30 border border-indigo-700/40 text-indigo-300 px-3 py-1 rounded-full font-bold">
            מבחן תיקיות
          </span>
        )}
        {isFalseFriendMode && (
          <span className="text-xs bg-orange-900/30 border border-orange-700/40 text-orange-300 px-3 py-1 rounded-full font-bold flex items-center gap-1">
            <AlertTriangle size={11} /> חברים כוזבים
          </span>
        )}
        {supabaseUser && (
          <span className="text-xs bg-yellow-900/20 border border-yellow-700/30 text-yellow-400 px-3 py-1 rounded-full font-bold flex items-center gap-1">
            <Zap size={11} /> +10 XP לתשובה נכונה
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-slate-400 font-bold text-base">{index + 1} / {total}</span>
          <span className="text-green-400 font-bold text-base">{score} ✓</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500
              ${isFalseFriendMode
                ? 'bg-gradient-to-r from-orange-600 to-amber-500'
                : 'bg-gradient-to-r from-blue-600 to-indigo-500'
              }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex gap-1.5 justify-center">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${
                i < index    ? `w-2.5 h-2.5 ${isFalseFriendMode ? 'bg-orange-500' : 'bg-blue-500'}` :
                i === index  ? `w-4 h-2.5 ${isFalseFriendMode ? 'bg-orange-400' : 'bg-blue-400'}` :
                               'w-2.5 h-2.5 bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question card */}
      <div className={`border rounded-3xl p-8 text-center shadow-2xl
        ${isFalseFriendMode
          ? 'bg-gradient-to-br from-orange-950/40 to-slate-900 border-orange-800/30'
          : 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700'
        }`}
      >
        {isFalseFriendMode && (
          <p className="text-orange-400/70 text-xs font-bold uppercase tracking-widest mb-3">
            ⚠️ חבר כוזב — מה המשמעות הנכונה?
          </p>
        )}
        {!isFalseFriendMode && (
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-5">מה התרגום?</p>
        )}
        <p dir="ltr" className="text-6xl font-black text-white mb-4 tracking-tight">{currentWord.word}</p>
        {currentWord.baseForm && (
          <p dir="ltr" className="text-slate-500 text-base font-mono mb-2">← {currentWord.baseForm}</p>
        )}
        {currentWord.pos && !isFalseFriendMode && (
          <span className="text-sm px-3 py-1 rounded-full bg-slate-700/80 text-slate-400 font-medium">
            {currentWord.pos}
          </span>
        )}
        {isFalseFriendMode && currentWord.example && (
          <p dir="ltr" className="text-slate-400 text-sm mt-3 italic leading-relaxed">
            "{currentWord.example}"
          </p>
        )}
      </div>

      {/* Humor toast for wrong false-friend answer */}
      {humorToast && (
        <div className="bg-orange-900/30 border border-orange-700/40 rounded-2xl p-4 text-orange-300 text-sm font-bold text-center animate-pulse">
          {humorToast}
        </div>
      )}

      {/* Options */}
      <div className="grid grid-cols-1 gap-3">
        {currentWord.options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(option)}
            disabled={!!selectedOption}
            className={`w-full py-5 px-5 rounded-2xl border-2 font-bold text-right transition-all flex items-center justify-between gap-4 active:scale-98
              ${optionStyle(option)}`}
          >
            <span className="flex items-center gap-4">
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0
                ${!selectedOption                        ? 'bg-slate-700 text-slate-300' :
                  option === currentWord.translation     ? 'bg-green-800 text-green-300' :
                  option === selectedOption              ? 'bg-red-800 text-red-300'
                                                        : 'bg-slate-700/40 text-slate-500'}`}
              >
                {LETTERS[i]}
              </span>
              <span className="text-lg">{option}</span>
            </span>
            {optionIcon(option)}
          </button>
        ))}
      </div>
    </div>
  );
};

export { ExamPage };
export default ExamPage;

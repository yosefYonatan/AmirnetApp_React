import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, CheckCircle2, XCircle } from 'lucide-react';
import { useVocab } from '../context/VocabContext';

const LETTERS = ['א', 'ב', 'ג', 'ד'];

const ExamPage = () => {
  const navigate = useNavigate();
  const { examWords, setExamWords, setExamResults, setSelectedShow, setSelectedEpisode } = useVocab();
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [results, setResults] = useState([]);

  useEffect(() => {
    setIndex(0);
    setScore(0);
    setSelectedOption(null);
    setResults([]);
  }, [examWords]);

  if (!examWords || examWords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 text-center px-4">
        <GraduationCap size={56} className="mb-4 opacity-30" />
        <p className="text-xl font-bold text-slate-400">אין מבחן פעיל</p>
        <p className="text-sm mt-2">חזור לסקירה ובחר מילים למבחן</p>
      </div>
    );
  }

  const currentWord = examWords[index];
  const total = examWords.length;
  const progress = (index / total) * 100;

  const handleAnswer = (option) => {
    if (selectedOption !== null) return;
    setSelectedOption(option);

    const isCorrect = option === currentWord.translation;
    const newScore = isCorrect ? score + 1 : score;
    if (isCorrect) setScore(newScore);

    const newResults = [...results, { ...currentWord, chosen: option, correct: isCorrect }];
    setResults(newResults);

    setTimeout(() => {
      if (index < total - 1) {
        setIndex(i => i + 1);
        setSelectedOption(null);
      } else {
        setExamResults({ score: newScore, total, results: newResults });
        // Clear active episode so /watch shows the home screen (not the timer)
        setSelectedShow(null);
        setSelectedEpisode('');
        navigate('/watch');
      }
    }, 1500);
  };

  const optionStyle = (option) => {
    if (!selectedOption) {
      return 'bg-slate-800/80 border-slate-700 hover:border-blue-400 hover:bg-slate-700 active:scale-98';
    }
    if (option === currentWord.translation) {
      return 'bg-green-900/40 border-green-500 text-green-300';
    }
    if (option === selectedOption) {
      return 'bg-red-900/40 border-red-500 text-red-300';
    }
    return 'bg-slate-800/40 border-slate-700/40 opacity-40';
  };

  const optionIcon = (option) => {
    if (!selectedOption) return null;
    if (option === currentWord.translation) return <CheckCircle2 size={24} className="text-green-400 flex-shrink-0" />;
    if (option === selectedOption) return <XCircle size={24} className="text-red-400 flex-shrink-0" />;
    return null;
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-5 space-y-5">
      {/* Progress */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-slate-400 font-bold text-base">{index + 1} / {total}</span>
          <span className="text-green-400 font-bold text-base">{score} ✓</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex gap-1.5 justify-center">
          {examWords.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${
                i < index ? 'w-2.5 h-2.5 bg-blue-500' :
                i === index ? 'w-4 h-2.5 bg-blue-400' :
                'w-2.5 h-2.5 bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-8 text-center shadow-2xl">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-5">מה התרגום?</p>
        <p dir="ltr" className="text-6xl font-black text-white mb-4 tracking-tight">{currentWord.word}</p>
        {currentWord.baseForm && (
          <p dir="ltr" className="text-slate-500 text-base font-mono mb-2">← {currentWord.baseForm}</p>
        )}
        {currentWord.pos && (
          <span className="text-sm px-3 py-1 rounded-full bg-slate-700/80 text-slate-400 font-medium">
            {currentWord.pos}
          </span>
        )}
      </div>

      {/* Options — tall, easy to tap */}
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
                ${!selectedOption ? 'bg-slate-700 text-slate-300' :
                  option === currentWord.translation ? 'bg-green-800 text-green-300' :
                  option === selectedOption ? 'bg-red-800 text-red-300' : 'bg-slate-700/40 text-slate-500'}`}
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

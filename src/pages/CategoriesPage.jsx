import React, { useState } from 'react';
import { GraduationCap, Utensils, Briefcase, Cpu, Heart, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useVocab } from '../context/VocabContext';
import WordCard from '../components/WordCard';
import { categorizeWord } from '../utils/wordAnalyzer';

// ==========================================
// CategoriesPage — all captured words grouped by topic
// ==========================================

const CATEGORIES = [
  { id: 'amirnet', label: 'מילות אמירנט',    icon: GraduationCap, color: 'blue',   desc: 'מילים מהמאגר האקדמי' },
  { id: 'food',    label: 'מזון',             icon: Utensils,      color: 'orange', desc: 'אוכל, בישול, מסעדות' },
  { id: 'work',    label: 'עבודה',            icon: Briefcase,     color: 'purple', desc: 'קריירה, עסקים, כלכלה' },
  { id: 'tech',    label: 'טכנולוגיה',        icon: Cpu,           color: 'cyan',   desc: 'מחשבים, אינטרנט, מכשירים' },
  { id: 'body',    label: 'גוף ובריאות',      icon: Heart,         color: 'red',    desc: 'רפואה, ספורט, גוף' },
  { id: 'general', label: 'כללי',             icon: BookOpen,      color: 'slate',  desc: 'מילים שונות' },
];

const COLOR_MAP = {
  blue:   { card: 'bg-blue-900/20 border-blue-800/40',   icon: 'bg-blue-500/20 text-blue-400',   count: 'text-blue-400'   },
  orange: { card: 'bg-orange-900/20 border-orange-800/40', icon: 'bg-orange-500/20 text-orange-400', count: 'text-orange-400' },
  purple: { card: 'bg-purple-900/20 border-purple-800/40', icon: 'bg-purple-500/20 text-purple-400', count: 'text-purple-400' },
  cyan:   { card: 'bg-cyan-900/20 border-cyan-800/40',   icon: 'bg-cyan-500/20 text-cyan-400',   count: 'text-cyan-400'   },
  red:    { card: 'bg-red-900/20 border-red-800/40',     icon: 'bg-red-500/20 text-red-400',     count: 'text-red-400'    },
  slate:  { card: 'bg-slate-800/60 border-slate-700/40', icon: 'bg-slate-700 text-slate-400',   count: 'text-slate-400'  },
};

const CategoriesPage = () => {
  const { capturedWords, reanalyzeWord } = useVocab();
  const [openCategory, setOpenCategory] = useState(null);

  // Group all non-invalid words by category
  const validWords = capturedWords.filter(w => !w.invalid);
  const grouped = {};
  CATEGORIES.forEach(c => { grouped[c.id] = []; });
  validWords.forEach(w => {
    const cat = categorizeWord(w.word, w.inDatabase);
    grouped[cat] = [...(grouped[cat] || []), w];
  });

  if (validWords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 text-center px-6">
        <BookOpen size={56} className="mb-4 opacity-30" />
        <p className="text-xl font-bold text-slate-400">אין מילים עדיין</p>
        <p className="text-sm mt-2">צפה בסדרה ואסוף מילים כדי לראות אותן מסודרות לפי קטגוריות</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-5 space-y-3 pb-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">
        {validWords.length} מילים בסך הכל
      </h2>

      {CATEGORIES.map(cat => {
        const words = grouped[cat.id] ?? [];
        if (words.length === 0) return null;
        const isOpen = openCategory === cat.id;
        const colors = COLOR_MAP[cat.color];
        const Icon = cat.icon;

        return (
          <div key={cat.id} className={`rounded-3xl border overflow-hidden ${colors.card}`}>
            {/* Folder header — tap to open/close */}
            <button
              className="w-full p-5 flex items-center gap-4 text-right"
              onClick={() => setOpenCategory(isOpen ? null : cat.id)}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${colors.icon}`}>
                <Icon size={24} />
              </div>
              <div className="flex-1 text-right">
                <div className="font-black text-lg text-white leading-tight">{cat.label}</div>
                <div className="text-slate-500 text-sm">{cat.desc}</div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-2xl font-black ${colors.count}`}>{words.length}</span>
                {isOpen
                  ? <ChevronUp size={20} className="text-slate-500" />
                  : <ChevronDown size={20} className="text-slate-500" />
                }
              </div>
            </button>

            {/* Word list — expanded */}
            {isOpen && (
              <div className="px-4 pb-4 space-y-2.5 border-t border-slate-800/60 pt-3">
                {words.map(w => (
                  <WordCard key={w.id} word={w} onReanalyze={reanalyzeWord} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CategoriesPage;

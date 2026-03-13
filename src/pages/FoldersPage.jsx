import React, { useState, useMemo } from 'react';
import {
  FolderOpen, XCircle, HelpCircle, Trash2,
  ChevronDown, ChevronUp, BookOpen, CheckCircle2,
  Plus, Send, Loader2, Clock
} from 'lucide-react';
import { useVocab, WORD_STATUS } from '../context/VocabContext';
import rawData from '../data/academicDB.json';
import { SHOWS_DB } from '../data/showsDB';

// ==========================================
// FoldersPage — Repository of word folders
//
// Built-in folders:
//   • Unknown   — words marked ✗ in VocabularyPage
//   • Uncertain — words marked ? in VocabularyPage
//
// Show folders:
//   • Theme vocabulary for each TV show
// ==========================================

// Build a lookup for academicDB words (word → full entry)
const DB_MAP = Object.create(null);
for (const e of rawData) DB_MAP[e.word.toLowerCase()] = e;

// ── Manual Add Panel ────────────────────────────────────────────────
const ManualAddPanel = () => {
  const { manualAddWord } = useVocab();
  const [input, setInput]       = useState('');
  const [status, setStatus]     = useState(WORD_STATUS.UNKNOWN);
  const [loading, setLoading]   = useState(false);
  const [feedback, setFeedback] = useState(null); // { word, translation, found }

  const handleAdd = async () => {
    const word = input.trim();
    if (!word) return;
    setLoading(true);
    setFeedback(null);
    const result = await manualAddWord(word, status);
    setLoading(false);
    setFeedback(result);
    setInput('');
  };

  const statusOptions = [
    { value: WORD_STATUS.UNKNOWN,   label: 'לא ידוע ✗', active: 'bg-red-700/60 text-red-200 border-red-600/50',   idle: 'bg-slate-800 text-slate-400 border-slate-700' },
    { value: WORD_STATUS.UNCERTAIN, label: 'לא בטוח ?',  active: 'bg-amber-700/60 text-amber-200 border-amber-600/50', idle: 'bg-slate-800 text-slate-400 border-slate-700' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-black text-white flex items-center gap-2">
        <Plus size={16} className="text-blue-400" />
        הוספה ידנית לתיקייה
      </h3>

      {/* Status toggle */}
      <div className="flex gap-2">
        {statusOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatus(opt.value)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition active:scale-95
              ${status === opt.value ? opt.active : opt.idle}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Input + Submit */}
      <div className="flex gap-2">
        <input
          type="text"
          dir="ltr"
          placeholder="Type a word..."
          value={input}
          onChange={e => { setInput(e.target.value); setFeedback(null); }}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="flex-1 bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-xl py-3 px-4 text-white text-sm outline-none transition placeholder:text-slate-600"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim() || loading}
          className="w-12 h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 rounded-xl flex items-center justify-center transition active:scale-90 self-center"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`rounded-xl p-3 text-sm border flex items-start gap-2
          ${feedback.found === 'none'
            ? 'bg-slate-800/60 border-slate-700 text-slate-400'
            : 'bg-green-900/20 border-green-800/30 text-green-300'}`}
        >
          <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <span dir="ltr" className="font-black">{feedback.word}</span>
            {feedback.translation
              ? <span className="text-slate-300"> — {feedback.translation}</span>
              : <span className="text-slate-500"> — תרגום לא נמצא</span>
            }
            <span className="text-slate-500 text-xs block mt-0.5">
              {status === WORD_STATUS.UNKNOWN ? 'נוסף לתיקיית "לא ידוע"' : 'נוסף לתיקיית "לא בטוח"'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Mini word card for folder contents
const FolderWordCard = ({ word, translation, pos, onRemove, onSetStatus, currentStatus }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
    <div className="flex-1 min-w-0">
      <span dir="ltr" className="font-black text-white text-base">{word}</span>
      {pos && (
        <span className="ml-2 text-[10px] text-slate-500 font-mono">{pos}</span>
      )}
      <p className="text-slate-400 text-sm mt-0.5">{translation}</p>
    </div>
    <div className="flex gap-1.5 flex-shrink-0">
      {/* Toggle to Known */}
      <button
        onClick={() => onSetStatus(word, WORD_STATUS.KNOWN)}
        className={`p-2 rounded-lg transition active:scale-90
          ${currentStatus === WORD_STATUS.KNOWN
            ? 'bg-green-700/50 text-green-300'
            : 'bg-slate-800 text-slate-500 hover:text-green-400'}`}
        title="סמן כידוע"
      >
        <CheckCircle2 size={15} />
      </button>
      {/* Remove from folder */}
      {onRemove && (
        <button
          onClick={() => onRemove(word)}
          className="p-2 rounded-lg bg-slate-800 text-slate-500 hover:text-red-400 transition active:scale-90"
          title="הסר מהתיקייה"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  </div>
);

// Collapsible folder section
const Folder = ({ title, icon: Icon, iconColor, cardBg, borderColor, count, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-3xl border overflow-hidden ${cardBg} ${borderColor}`}>
      <button
        className="w-full p-5 flex items-center gap-4 text-right"
        onClick={() => setOpen(o => !o)}
      >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
          <Icon size={24} />
        </div>
        <div className="flex-1 text-right">
          <div className="font-black text-lg text-white leading-tight">{title}</div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-2xl font-black text-slate-300">{count}</span>
          {open ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
        </div>
      </button>
      {open && count === 0 && (
        <div className="px-5 pb-5 text-slate-500 text-sm text-center italic">
          אין מילים בתיקייה זו עדיין
        </div>
      )}
      {open && count > 0 && (
        <div className="px-4 pb-4 space-y-2 border-t border-slate-800/60 pt-3">
          {children}
        </div>
      )}
    </div>
  );
};

const FoldersPage = () => {
  const { wordStatuses, setWordStatus, unknownWords, uncertainWords, manualAddWord, dueWords } = useVocab();
  const [openShow, setOpenShow] = useState(null);

  // Build full word objects for each folder
  const unknownEntries = useMemo(() =>
    unknownWords.map(w => DB_MAP[w] ?? { word: w, translation: '—', pos: null }),
    [unknownWords]
  );
  const uncertainEntries = useMemo(() =>
    uncertainWords.map(w => DB_MAP[w] ?? { word: w, translation: '—', pos: null }),
    [uncertainWords]
  );
  const dueEntries = useMemo(() =>
    dueWords.map(w => DB_MAP[w] ?? { word: w, translation: '—', pos: null }),
    [dueWords]
  );

  const handleRemove = (word) => setWordStatus(word, null);
  const handleSetKnown = (word) => setWordStatus(word, WORD_STATUS.KNOWN);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-4 space-y-4 pb-4">

      {/* Page header */}
      <div className="flex items-center gap-3 px-1">
        <FolderOpen size={22} className="text-blue-400" />
        <h2 className="font-black text-lg text-white">תיקיות לימוד</h2>
      </div>

      {/* ── MANUAL ADD ── */}
      <ManualAddPanel />

      {/* ── DUE FOR REVIEW FOLDER ── */}
      {dueEntries.length > 0 && (
        <Folder
          title="לחזרה היום"
          icon={Clock}
          iconColor="bg-blue-500/20 text-blue-400"
          cardBg="bg-blue-900/10"
          borderColor="border-blue-700/30"
          count={dueEntries.length}
          defaultOpen
        >
          {dueEntries.map(e => (
            <FolderWordCard
              key={e.word}
              word={e.word}
              translation={e.translation}
              pos={e.pos}
              currentStatus={wordStatuses[e.word.toLowerCase()]}
              onSetStatus={handleSetKnown}
              onRemove={handleRemove}
            />
          ))}
        </Folder>
      )}

      {/* ── UNKNOWN FOLDER ── */}
      <Folder
        title="לא ידוע"
        icon={XCircle}
        iconColor="bg-red-500/20 text-red-400"
        cardBg="bg-red-900/10"
        borderColor="border-red-800/30"
        count={unknownEntries.length}
        defaultOpen={unknownEntries.length > 0}
      >
        {unknownEntries.map(e => (
          <FolderWordCard
            key={e.word}
            word={e.word}
            translation={e.translation}
            pos={e.pos}
            currentStatus={wordStatuses[e.word.toLowerCase()]}
            onSetStatus={handleSetKnown}
            onRemove={handleRemove}
          />
        ))}
      </Folder>

      {/* ── UNCERTAIN FOLDER ── */}
      <Folder
        title="לא בטוח"
        icon={HelpCircle}
        iconColor="bg-amber-500/20 text-amber-400"
        cardBg="bg-amber-900/10"
        borderColor="border-amber-800/30"
        count={uncertainEntries.length}
        defaultOpen={uncertainEntries.length > 0}
      >
        {uncertainEntries.map(e => (
          <FolderWordCard
            key={e.word}
            word={e.word}
            translation={e.translation}
            pos={e.pos}
            currentStatus={wordStatuses[e.word.toLowerCase()]}
            onSetStatus={handleSetKnown}
            onRemove={handleRemove}
          />
        ))}
      </Folder>

      {/* ── SHOW VOCABULARY FOLDERS ── */}
      <div className="pt-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1 mb-3">
          אוצר מילים לפי סדרה
        </h3>
        <div className="space-y-3">
          {Object.entries(SHOWS_DB).map(([showName, show]) => {
            const isOpen = openShow === showName;
            return (
              <div
                key={showName}
                className={`rounded-3xl border overflow-hidden ${show.bgColor} ${show.borderColor}`}
              >
                <button
                  className="w-full p-5 flex items-center gap-4 text-right"
                  onClick={() => setOpenShow(isOpen ? null : showName)}
                >
                  {/* Show icon / poster */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${show.gradient} flex items-center justify-center flex-shrink-0 text-2xl shadow-lg`}>
                    {show.emoji}
                  </div>
                  <div className="flex-1 text-right">
                    <div className="font-black text-base text-white leading-tight">{showName}</div>
                    <div className="text-slate-500 text-xs mt-0.5">{show.description}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-sm font-black px-2 py-0.5 rounded-lg bg-gradient-to-br ${show.gradient} text-white`}>
                      {show.vocab.length} מילים
                    </span>
                    {isOpen ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-slate-800/60 pt-3 space-y-2">
                    {/* Themes */}
                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {show.themes.map(t => (
                        <span key={t} className={`text-xs px-2.5 py-1 rounded-lg bg-gradient-to-br ${show.gradient} text-white font-bold opacity-80`}>
                          {t}
                        </span>
                      ))}
                    </div>

                    {/* Vocab words */}
                    {show.vocab.map(v => {
                      const key = v.word.toLowerCase();
                      const status = wordStatuses[key];
                      return (
                        <div key={v.word} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <span dir="ltr" className="font-black text-white text-base">{v.word}</span>
                            <p className="text-slate-400 text-sm mt-0.5">{v.translation}</p>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => setWordStatus(v.word, status === WORD_STATUS.KNOWN ? null : WORD_STATUS.KNOWN)}
                              className={`p-2 rounded-lg transition active:scale-90 text-xs font-black
                                ${status === WORD_STATUS.KNOWN ? 'bg-green-700/50 text-green-300' : 'bg-slate-800 text-slate-500 hover:text-green-400'}`}
                              title="ידוע"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                            <button
                              onClick={() => setWordStatus(v.word, status === WORD_STATUS.UNKNOWN ? null : WORD_STATUS.UNKNOWN)}
                              className={`p-2 rounded-lg transition active:scale-90
                                ${status === WORD_STATUS.UNKNOWN ? 'bg-red-700/50 text-red-300' : 'bg-slate-800 text-slate-500 hover:text-red-400'}`}
                              title="לא ידוע"
                            >
                              <XCircle size={14} />
                            </button>
                            <button
                              onClick={() => setWordStatus(v.word, status === WORD_STATUS.UNCERTAIN ? null : WORD_STATUS.UNCERTAIN)}
                              className={`p-2 rounded-lg transition active:scale-90
                                ${status === WORD_STATUS.UNCERTAIN ? 'bg-amber-700/50 text-amber-300' : 'bg-slate-800 text-slate-500 hover:text-amber-400'}`}
                              title="לא בטוח"
                            >
                              <HelpCircle size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {unknownEntries.length === 0 && uncertainEntries.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold">אין מילים בתיקיות עדיין</p>
          <p className="text-sm mt-1">עבור לאוצר מילים וסמן מילים עם ✗ או ?</p>
        </div>
      )}
    </div>
  );
};

export default FoldersPage;

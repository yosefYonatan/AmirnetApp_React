import { CheckCircle2, XCircle, RefreshCw, Loader2, Globe } from 'lucide-react';
import { formatTime } from '../utils/formatTime';

const scoreColor = (score) => {
  if (score >= 80) return 'bg-green-900/40 text-green-400 border-green-700/30';
  if (score >= 50) return 'bg-yellow-900/40 text-yellow-400 border-yellow-700/30';
  return 'bg-red-900/40 text-red-400 border-red-700/30';
};

const LevelDots = ({ level }) => {
  if (!level) return null;
  return (
    <span className="flex gap-0.5 items-center">
      {[1, 2, 3].map(i => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i <= level ? 'bg-blue-400' : 'bg-slate-700'}`}
        />
      ))}
    </span>
  );
};

const WordCard = ({ word, onReanalyze, selectable, selected, onToggle }) => {
  const { word: english, translation, score, inDatabase, baseForm, episodeTime, loading, source, pos, level } = word;

  const StatusIcon = () => {
    if (loading)             return <Loader2 size={20} className="text-blue-400 animate-spin" />;
    if (inDatabase)          return <CheckCircle2 size={20} className="text-green-500" />;
    if (source === 'online') return <Globe size={20} className="text-sky-500" />;
    return <XCircle size={20} className="text-slate-600" />;
  };

  return (
    <div
      className={`rounded-2xl p-4 flex items-start gap-3 transition-all
        ${selected
          ? 'bg-blue-950/40 border border-blue-500/50 shadow-sm shadow-blue-900/20'
          : 'bg-slate-900 border border-slate-800'}
        ${selectable ? 'cursor-pointer active:scale-[0.99]' : ''}
      `}
      onClick={selectable ? onToggle : undefined}
    >
      {/* Checkbox */}
      {selectable && (
        <div className={`mt-1.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
          ${selected ? 'bg-blue-600 border-blue-600' : 'border-slate-600'}`}
        >
          {selected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
        </div>
      )}

      {/* DB status icon */}
      <div className="flex-shrink-0 mt-1.5">
        <StatusIcon />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span dir="ltr" className="font-black text-white text-xl leading-tight">{english}</span>
          {baseForm && (
            <span dir="ltr" className="text-sm text-slate-500 font-mono">← {baseForm}</span>
          )}
          <LevelDots level={level} />
        </div>
        {loading
          ? <p className="text-slate-500 text-base mt-1 italic">מחפש תרגום...</p>
          : <p className="text-slate-300 text-base mt-1 leading-snug">{translation}</p>
        }
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {pos && (
            <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 font-medium">
              {pos}
            </span>
          )}
          {episodeTime !== undefined && (
            <span className="text-slate-500 text-sm font-mono">{formatTime(episodeTime)}</span>
          )}
        </div>
      </div>

      {/* Score badge + re-analyze */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className={`text-sm font-black px-2.5 py-1 rounded-full border ${scoreColor(score)}`}>
          {score}
        </span>
        {onReanalyze && (
          <button
            onClick={(e) => { e.stopPropagation(); onReanalyze(word); }}
            className="text-slate-600 hover:text-slate-300 transition-colors p-1.5"
            title="נתח מחדש"
          >
            <RefreshCw size={15} />
          </button>
        )}
      </div>
    </div>
  );
};

export default WordCard;

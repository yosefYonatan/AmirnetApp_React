import React from 'react';
import { Delete } from 'lucide-react';

// ==========================================
// MathNumpad — Custom psychometric numpad
//
// 3×3 digit grid + 0 + backspace + ENTER.
// Uses pointer events so it never opens the
// system keyboard on mobile.
// Large touch targets optimised for thumbs.
// ==========================================

// Layout: rows of [label, value]
// value: digit string | 'back' | 'submit'
const ROWS = [
  [['7','7'], ['8','8'], ['9','9']],
  [['4','4'], ['5','5'], ['6','6']],
  [['1','1'], ['2','2'], ['3','3']],
  [['⌫','back'], ['0','0'], ['✓','submit']],
];

const MathNumpad = ({ value = '', onChange, onSubmit, disabled = false }) => {
  const handle = (key) => {
    if (disabled) return;
    if (key === 'back') {
      onChange(value.slice(0, -1));
    } else if (key === 'submit') {
      if (value.length > 0) onSubmit();
    } else {
      if (value.length >= 5) return;   // cap at 5 digits
      onChange(value + key);
    }
  };

  return (
    <div className="w-full select-none" dir="ltr">
      {ROWS.map((row, ri) => (
        <div key={ri} className="flex gap-2.5 mb-2.5">
          {row.map(([label, key]) => {
            const isSubmit = key === 'submit';
            const isBack   = key === 'back';

            return (
              <button
                key={key}
                // pointerDown prevents focus steal + works on touch
                onPointerDown={(e) => { e.preventDefault(); handle(key); }}
                disabled={disabled}
                aria-label={isSubmit ? 'אשר תשובה' : isBack ? 'מחק' : label}
                className={[
                  'flex-1 h-16 rounded-2xl font-black text-2xl',
                  'transition-all duration-75 active:scale-90 active:brightness-125',
                  'flex items-center justify-center',
                  isSubmit
                    ? 'bg-gradient-to-b from-green-400 to-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                    : isBack
                      ? 'bg-slate-700/80 text-slate-300'
                      : 'bg-slate-800 text-white hover:bg-slate-700',
                  disabled ? 'opacity-30 pointer-events-none' : '',
                ].join(' ')}
              >
                {isBack ? <Delete size={20} /> : label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default MathNumpad;

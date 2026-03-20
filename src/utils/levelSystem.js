// ==========================================
// levelSystem.js — XP → Level mapping
//
// Pure utility, zero React, zero Supabase.
// All level computation happens client-side
// from the existing xp_points column.
// ==========================================

export const LEVELS = [
  { level: 1,  xp: 0,    name: 'מתחיל',  color: 'slate'   },
  { level: 2,  xp: 100,  name: 'לומד',   color: 'blue'    },
  { level: 3,  xp: 250,  name: 'סקרן',   color: 'cyan'    },
  { level: 4,  xp: 500,  name: 'מתקדם',  color: 'indigo'  },
  { level: 5,  xp: 900,  name: 'מיומן',  color: 'purple'  },
  { level: 6,  xp: 1400, name: 'מומחה',  color: 'fuchsia' },
  { level: 7,  xp: 2000, name: 'אלוף',   color: 'amber'   },
  { level: 8,  xp: 3000, name: 'אגדה',   color: 'orange'  },
  { level: 9,  xp: 5000, name: 'גאון',   color: 'red'     },
  { level: 10, xp: 8000, name: 'מאסטר',  color: 'yellow'  },
];

// Tailwind class sets per color — must be complete strings so Tailwind
// includes them in the purge bundle (template literals won't work).
// bar — explicit bg class for the XP progress bar fill.
// Must be a complete literal string so Tailwind's static scanner includes it.
export const LEVEL_STYLES = {
  slate:   { bg: 'bg-slate-700/40',   border: 'border-slate-500/50',   text: 'text-slate-200',   bar: 'bg-slate-200'   },
  blue:    { bg: 'bg-blue-700/30',    border: 'border-blue-500/50',    text: 'text-blue-300',    bar: 'bg-blue-300'    },
  cyan:    { bg: 'bg-cyan-700/30',    border: 'border-cyan-500/50',    text: 'text-cyan-300',    bar: 'bg-cyan-300'    },
  indigo:  { bg: 'bg-indigo-700/30',  border: 'border-indigo-500/50',  text: 'text-indigo-300',  bar: 'bg-indigo-300'  },
  purple:  { bg: 'bg-purple-700/30',  border: 'border-purple-500/50',  text: 'text-purple-300',  bar: 'bg-purple-300'  },
  fuchsia: { bg: 'bg-fuchsia-700/30', border: 'border-fuchsia-500/50', text: 'text-fuchsia-300', bar: 'bg-fuchsia-300' },
  amber:   { bg: 'bg-amber-700/30',   border: 'border-amber-500/50',   text: 'text-amber-300',   bar: 'bg-amber-300'   },
  orange:  { bg: 'bg-orange-700/30',  border: 'border-orange-500/50',  text: 'text-orange-300',  bar: 'bg-orange-300'  },
  red:     { bg: 'bg-red-700/30',     border: 'border-red-500/50',     text: 'text-red-300',     bar: 'bg-red-300'     },
  yellow:  { bg: 'bg-yellow-500/20',  border: 'border-yellow-400/50',  text: 'text-yellow-300',  bar: 'bg-yellow-300'  },
};

/**
 * Returns full level info for a given XP value.
 *
 * @param {number} xp  — raw xp_points from Supabase profiles table
 * @returns {{
 *   level: number,
 *   name: string,
 *   color: string,
 *   styles: { bg, border, text },
 *   currentLevelXP: number,   — XP at the start of this level
 *   nextLevelXP: number,      — XP needed for next level (Infinity if max)
 *   progressXP: number,       — XP earned within this level
 *   rangeXP: number,          — total XP needed to complete this level
 *   progress: number,         — 0–1 fraction for progress bar
 *   isMax: boolean
 * }}
 */
export const getLevelInfo = (xp = 0) => {
  const safeXP = Math.max(0, xp);

  // Find the highest tier the user has reached
  let current = LEVELS[0];
  for (const tier of LEVELS) {
    if (safeXP >= tier.xp) current = tier;
    else break;
  }

  const isMax        = current.level === LEVELS[LEVELS.length - 1].level;
  const nextTier     = isMax ? null : LEVELS[current.level]; // LEVELS is 0-indexed, level is 1-indexed → LEVELS[level] is next
  const nextLevelXP  = nextTier ? nextTier.xp : Infinity;
  const currentLevelXP = current.xp;
  const progressXP   = safeXP - currentLevelXP;
  const rangeXP      = isMax ? 1 : nextLevelXP - currentLevelXP;
  const progress     = isMax ? 1 : Math.min(progressXP / rangeXP, 1);

  return {
    level:        current.level,
    name:         current.name,
    color:        current.color,
    styles:       LEVEL_STYLES[current.color],
    currentLevelXP,
    nextLevelXP,
    progressXP,
    rangeXP,
    progress,
    isMax,
  };
};

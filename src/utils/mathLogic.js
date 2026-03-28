// ==========================================
// MATH LOGIC — Psychometric Drill Generator
//
// Generates questions for:
//  • Squares  (x², 1–20, emphasis on 11–20)
//  • Roots    (√y for perfect squares up to 400)
//  • Addition (2-digit + 1-digit / 2-digit + 2-digit)
//  • Subtraction (complements of 100)
//  • Multiplication (12×12 table + ×15)
//  • Division (divisors 2,3,4,5,10 — no remainder)
// ==========================================

const randInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// ── Static squares map 1–20 ────────────────────────────────────────────
export const SQUARES_MAP = {};
for (let i = 1; i <= 20; i++) SQUARES_MAP[i] = i * i;

// [1, 4, 9, 16, … 400]
export const PERFECT_SQUARES = Object.values(SQUARES_MAP);

// ── Distractor helpers ─────────────────────────────────────────────────

/**
 * Generate 3 plausible wrong answers for a squares question.
 * Includes a "digit-flip" (e.g. 196 → 169) and ±10/±11 variants.
 */
export function squaresDistractors(x, correct) {
  const cands = new Set();
  const s = String(correct);

  // Digit-flip: swap the last two digits (196 → 169, etc.)
  if (s.length === 3) {
    const flipped = Number(s[0] + s[2] + s[1]);
    if (flipped !== correct && flipped > 0) cands.add(flipped);
    // Swap first two digits (196 → 916 too large — skip if > 400)
    const flipped2 = Number(s[1] + s[0] + s[2]);
    if (flipped2 !== correct && flipped2 > 0 && flipped2 <= 500) cands.add(flipped2);
  }
  // ±10, ±11 from the correct value
  [correct + 10, correct - 10, correct + 11, correct - 11].forEach(v => {
    if (v > 0) cands.add(v);
  });
  // Squares of adjacent bases
  if (x > 1)  cands.add(SQUARES_MAP[x - 1]);
  if (x < 20) cands.add(SQUARES_MAP[x + 1]);

  return [...cands]
    .filter(d => d !== correct && d > 0)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
}

/**
 * Generate 3 plausible wrong answers for a roots question.
 */
export function rootsDistractors(correct) {
  const cands = new Set();
  [correct + 1, correct - 1, correct + 2, correct - 2, correct + 3].forEach(v => {
    if (v > 0) cands.add(v);
  });
  return [...cands]
    .filter(d => d !== correct && d > 0)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
}

// ── Question generators ────────────────────────────────────────────────

function generateSquaresQ() {
  // 70 % chance draw from the psychometric-critical 11–20 range
  const useHard = Math.random() < 0.7;
  const pool = useHard
    ? [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const x = pool[Math.floor(Math.random() * pool.length)];
  const answer = SQUARES_MAP[x];
  return {
    type: 'square',
    category: x >= 11 ? 'squares-hard' : 'squares-easy',
    display: `${x}²`,
    answer,
    isHardSquare: x >= 11,
    isHighRoot: false,
    distractors: squaresDistractors(x, answer),
    x,
  };
}

function generateRootsQ() {
  const y = PERFECT_SQUARES[Math.floor(Math.random() * PERFECT_SQUARES.length)];
  const answer = Math.round(Math.sqrt(y));
  const isHighRoot = y > 200;
  return {
    type: 'root',
    category: isHighRoot ? 'roots-high' : 'roots-low',
    display: `√${y}`,
    answer,
    isHardSquare: false,
    isHighRoot,
    distractors: rootsDistractors(answer),
    y,
  };
}

function generateAdditionQ() {
  const level = Math.random() < 0.5 ? 1 : 2;
  const a = randInt(10, 99);
  const b = level === 1 ? randInt(1, 9) : randInt(10, 99);
  return {
    type: 'addition',
    category: level === 1 ? 'addition-l1' : 'addition-l2',
    display: `${a} + ${b}`,
    answer: a + b,
    isHardSquare: false,
    isHighRoot: false,
    distractors: [],
  };
}

function generateSubtractionQ() {
  // Complements of 100
  const n = randInt(1, 99);
  return {
    type: 'subtraction',
    category: 'subtraction-100',
    display: `100 − ${n}`,
    answer: 100 - n,
    isHardSquare: false,
    isHighRoot: false,
    distractors: [],
  };
}

function generateMultiplicationQ() {
  const useX15 = Math.random() < 0.3;
  if (useX15) {
    const n = randInt(2, 12);
    return {
      type: 'multiplication',
      category: 'mult-15',
      display: `15 × ${n}`,
      answer: 15 * n,
      isHardSquare: false,
      isHighRoot: false,
      distractors: [],
    };
  }
  const a = randInt(2, 12);
  const b = randInt(2, 12);
  return {
    type: 'multiplication',
    category: 'mult-table',
    display: `${a} × ${b}`,
    answer: a * b,
    isHardSquare: false,
    isHighRoot: false,
    distractors: [],
  };
}

function generateDivisionQ() {
  const DIVISORS = [2, 3, 4, 5, 10];
  const divisor = DIVISORS[Math.floor(Math.random() * DIVISORS.length)];
  const quotient = randInt(2, 20);
  return {
    type: 'division',
    category: `div-${divisor}`,
    display: `${quotient * divisor} ÷ ${divisor}`,
    answer: quotient,
    isHardSquare: false,
    isHighRoot: false,
    distractors: [],
  };
}

// ── Public catalogue ──────────────────────────────────────────────────

/** All available drill types with display labels */
export const CATEGORIES = {
  square:         { label: 'ריבועים (²)',         icon: '²' },
  root:           { label: 'שורשים (√)',           icon: '√' },
  addition:       { label: 'חיבור (+)',            icon: '+' },
  subtraction:    { label: 'השלמה ל-100 (−)',      icon: '−' },
  multiplication: { label: 'כפל (×)',              icon: '×' },
  division:       { label: 'חילוק (÷)',            icon: '÷' },
};

/** Fine-grained category labels used in analytics */
export const CATEGORY_FINE_LABELS = {
  'squares-easy':    'ריבועים 1-10',
  'squares-hard':    'ריבועים 11-20 🔥',
  'roots-low':       'שורשים עד √200',
  'roots-high':      'שורשים מעל √200',
  'addition-l1':     'חיבור רמה 1',
  'addition-l2':     'חיבור רמה 2',
  'subtraction-100': 'השלמה ל-100',
  'mult-table':      'לוח כפל',
  'mult-15':         'כפולות 15',
  'div-2':           'חילוק ב-2',
  'div-3':           'חילוק ב-3',
  'div-4':           'חילוק ב-4',
  'div-5':           'חילוק ב-5',
  'div-10':          'חילוק ב-10',
};

/**
 * Generate a single question from the enabled types.
 * @param {string[]} enabledTypes - subset of Object.keys(CATEGORIES)
 */
export function generateQuestion(enabledTypes) {
  const pool = enabledTypes?.length ? enabledTypes : Object.keys(CATEGORIES);
  const type = pool[Math.floor(Math.random() * pool.length)];
  switch (type) {
    case 'square':         return generateSquaresQ();
    case 'root':           return generateRootsQ();
    case 'addition':       return generateAdditionQ();
    case 'subtraction':    return generateSubtractionQ();
    case 'multiplication': return generateMultiplicationQ();
    case 'division':       return generateDivisionQ();
    default:               return generateSquaresQ();
  }
}

// ── Analytics ─────────────────────────────────────────────────────────

/**
 * Compute per-category performance stats from a session history.
 * @param {{ category: string, timeMs: number, correct: boolean }[]} history
 * @returns {{ byCategory, weaknesses, strengths }}
 */
export function calculateAnalytics(history) {
  const cats = {};

  for (const entry of history) {
    const k = entry.category;
    if (!cats[k]) cats[k] = { correctTimes: [], total: 0, correct: 0 };
    cats[k].total++;
    if (entry.correct) {
      cats[k].correct++;
      cats[k].correctTimes.push(entry.timeMs);
    }
  }

  const byCategory = {};
  for (const [k, data] of Object.entries(cats)) {
    const avgMs = data.correctTimes.length
      ? Math.round(data.correctTimes.reduce((a, b) => a + b, 0) / data.correctTimes.length)
      : 3000;
    byCategory[k] = {
      label:    CATEGORY_FINE_LABELS[k] ?? k,
      avgMs,
      accuracy: data.total > 0 ? data.correct / data.total : 0,
      total:    data.total,
    };
  }

  // Weakness: avg correct-time > 2 000 ms OR accuracy below 70 %
  const weaknesses = Object.values(byCategory)
    .filter(d => d.total >= 2 && (d.avgMs > 2000 || d.accuracy < 0.7))
    .map(d => d.label);

  // Strength: avg correct-time ≤ 1 200 ms AND accuracy ≥ 90 %
  const strengths = Object.values(byCategory)
    .filter(d => d.total >= 2 && d.avgMs <= 1200 && d.accuracy >= 0.9)
    .map(d => d.label);

  return { byCategory, weaknesses, strengths };
}

// ==========================================
// SRS Algorithm — Simplified SM-2
//
// Quality mapping:
//   known     → quality 5 (easy correct answer)
//   uncertain → quality 3 (correct but hesitant)
//   unknown   → quality 0 (wrong / blackout)
//
// Returns updated SRS fields to merge into wordSRSData entry.
// ==========================================

export const QUALITY = {
  known:     5,
  uncertain: 3,
  unknown:   0,
};

const MIN_EASE = 1.3;

/**
 * Compute next SRS state from current state + word status quality.
 * @param {object|null} current - { intervalDays, repetitions, easeFactor }
 * @param {number} quality - 0..5
 * @returns {{ nextReviewDate: number, intervalDays: number, repetitions: number, easeFactor: number }}
 */
export const computeNextSRS = (current, quality) => {
  let { intervalDays = 1, repetitions = 0, easeFactor = 2.5 } = current ?? {};

  if (quality < 3) {
    // Failed — reset streak; review very soon
    repetitions  = 0;
    intervalDays = quality === 0 ? 0.007 : 0.5; // ~10 min or ~12 h
  } else {
    // Correct — advance interval
    if      (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else                        intervalDays = Math.round(intervalDays * easeFactor);

    // Update ease factor (SM-2 formula)
    easeFactor = Math.max(
      MIN_EASE,
      easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    );
    repetitions += 1;
  }

  const nextReviewDate = Date.now() + intervalDays * 24 * 60 * 60 * 1000;
  return { nextReviewDate, intervalDays, repetitions, easeFactor };
};

/**
 * Returns true if the SRS entry is due for review right now.
 * @param {object|null} entry - SRS metadata entry from wordSRSData
 */
export const isDueForReview = (entry) => {
  if (!entry || typeof entry !== 'object') return false;
  return (entry.nextReviewDate ?? 0) <= Date.now();
};

// ==========================================
// folderSystem.js — English Vocabulary Folder System
//
// Divides 1,058 academicDB words into 14 progressive
// difficulty folders using the existing `level` field:
//   Level 1 (113 words) → Folders  1–4  (Basic)
//   Level 2 (534 words) → Folders  5–10 (Advanced)
//   Level 3 (411 words) → Folders 11–14 (Expert, ×1.5 XP)
//
// Folder N+1 unlocks only when N is ≥80% mastered.
// ==========================================

import rawData from '../data/academicDB.json';
import { SHOWS_DB } from '../data/showsDB';

// ── Folder metadata ────────────────────────────────────────────────────
export const PROGRESS_THRESHOLD = 0.8; // 80% known to unlock next folder

/** Color progression: bright green → deep crimson (14 stops) */
export const FOLDER_META = [
  // ── Basic (Level 1) ────────────────────────────────────────────────
  { id:  1, heLabel: 'מתחיל',    tier: 'basic',    xpMultiplier: 1.0, color: '#22c55e' },
  { id:  2, heLabel: 'בסיסי',    tier: 'basic',    xpMultiplier: 1.0, color: '#84cc16' },
  { id:  3, heLabel: 'יסודי',    tier: 'basic',    xpMultiplier: 1.0, color: '#bef264' },
  { id:  4, heLabel: 'יסודי+',   tier: 'basic',    xpMultiplier: 1.0, color: '#facc15' },
  // ── Advanced (Level 2) ─────────────────────────────────────────────
  { id:  5, heLabel: 'בינוני',   tier: 'advanced', xpMultiplier: 1.0, color: '#f59e0b' },
  { id:  6, heLabel: 'אקדמי',    tier: 'advanced', xpMultiplier: 1.0, color: '#fb923c' },
  { id:  7, heLabel: 'אקדמי+',   tier: 'advanced', xpMultiplier: 1.0, color: '#f97316' },
  { id:  8, heLabel: 'מתקדם',    tier: 'advanced', xpMultiplier: 1.0, color: '#ef4444' },
  { id:  9, heLabel: 'מתקדם+',   tier: 'advanced', xpMultiplier: 1.0, color: '#dc2626' },
  { id: 10, heLabel: 'מלומד',    tier: 'advanced', xpMultiplier: 1.0, color: '#b91c1c' },
  // ── Expert (Level 3) ──────────────────────────────────────────────
  { id: 11, heLabel: 'מומחה',    tier: 'expert',   xpMultiplier: 1.5, color: '#991b1b' },
  { id: 12, heLabel: 'מומחה+',   tier: 'expert',   xpMultiplier: 1.5, color: '#7c3aed' },
  { id: 13, heLabel: 'דוקטורט',  tier: 'expert',   xpMultiplier: 1.5, color: '#6d28d9' },
  { id: 14, heLabel: 'מאסטר',    tier: 'expert',   xpMultiplier: 1.5, color: '#4c1d95' },
];

// ── Word assignment ────────────────────────────────────────────────────
/** Split arr into n roughly-equal chunks (earlier chunks get the extras). */
function splitChunks(arr, n) {
  const result = [];
  const base  = Math.floor(arr.length / n);
  const extra = arr.length % n;
  let start   = 0;
  for (let i = 0; i < n; i++) {
    const end = start + base + (i < extra ? 1 : 0);
    result.push(arr.slice(start, end));
    start = end;
  }
  return result;
}

const byLevel = (lvl) =>
  rawData
    .filter(w => w.level === lvl)
    .sort((a, b) => a.word.localeCompare(b.word));

// Pre-computed folder word arrays (index 0 = folder 1)
const _FOLDER_WORDS = [
  ...splitChunks(byLevel(1), 4),   // folders  1–4
  ...splitChunks(byLevel(2), 6),   // folders  5–10
  ...splitChunks(byLevel(3), 4),   // folders 11–14
];

/** Returns the word array for a given folder (1-indexed). */
export function getFolderWords(folderId) {
  return _FOLDER_WORDS[folderId - 1] ?? [];
}

// ── Mastery helpers ────────────────────────────────────────────────────
/**
 * Returns fraction of a folder's words marked 'known' (0–1).
 * @param {number} folderId
 * @param {{ [wordLower]: string }} wordStatuses
 */
export function getFolderMastery(folderId, wordStatuses) {
  const words = getFolderWords(folderId);
  if (!words.length) return 0;
  const known = words.filter(w => wordStatuses[w.word.toLowerCase()] === 'known').length;
  return known / words.length;
}

/**
 * Returns true when folderId is accessible:
 *   - Folder 1 is always unlocked
 *   - Folder N requires folder N-1 to be ≥ PROGRESS_THRESHOLD mastered
 */
export function isFolderUnlocked(folderId, wordStatuses) {
  if (folderId <= 1) return true;
  return getFolderMastery(folderId - 1, wordStatuses) >= PROGRESS_THRESHOLD;
}

// ── TV-show context (badge + rich popover) ────────────────────────────

// Index 1: word → shows where it appears in the vocab list
const _SHOW_WORD_MAP = new Map();
// Index 2: word → episodes where it appears as a vocab hint (richer context)
const _EPISODE_WORD_INDEX = new Map();

Object.entries(SHOWS_DB).forEach(([showName, show]) => {
  // Vocab-level entries
  (show.vocab ?? []).forEach(({ word }) => {
    const key = word.toLowerCase();
    if (!_SHOW_WORD_MAP.has(key)) _SHOW_WORD_MAP.set(key, []);
    _SHOW_WORD_MAP.get(key).push({ name: showName, emoji: show.emoji ?? '📺' });
  });
  // Episode-level entries (also add to _SHOW_WORD_MAP for broader badge coverage)
  Object.entries(show.episodes ?? {}).forEach(([season, eps]) => {
    Object.entries(eps).forEach(([episode, epData]) => {
      (epData.words ?? []).forEach(w => {
        const key = w.toLowerCase();
        if (!_EPISODE_WORD_INDEX.has(key)) _EPISODE_WORD_INDEX.set(key, []);
        _EPISODE_WORD_INDEX.get(key).push({
          showName, show,
          season:  Number(season),
          episode: Number(episode),
          summary: epData.summary,
        });
        // Also register in the simple badge map
        if (!_SHOW_WORD_MAP.has(key)) _SHOW_WORD_MAP.set(key, []);
        if (!_SHOW_WORD_MAP.get(key).some(e => e.name === showName)) {
          _SHOW_WORD_MAP.get(key).push({ name: showName, emoji: show.emoji ?? '📺' });
        }
      });
    });
  });
});

/**
 * Quick badge check — returns [{name, emoji}] or null.
 */
export function getShowContext(word) {
  return _SHOW_WORD_MAP.get(word.toLowerCase()) ?? null;
}

/**
 * Full context for the 📺 popover.
 * Prioritises episode-level matches (have season/episode/summary) over
 * vocab-only matches.  If `preferredShow` is given, prefers that show.
 *
 * Returns { showName, showId, emoji, gradient, bgColor, borderColor,
 *           description, season, episode, episodeLabel, summary,
 *           imageAsset, characterName } or null.
 */
export function getWordContext(word, preferredShow = null) {
  const key = word.toLowerCase();

  const epMatches    = _EPISODE_WORD_INDEX.get(key) ?? [];
  const vocabMatches = [];
  Object.entries(SHOWS_DB).forEach(([showName, show]) => {
    if ((show.vocab ?? []).some(v => v.word.toLowerCase() === key)) {
      vocabMatches.push({ showName, show });
    }
  });

  if (!epMatches.length && !vocabMatches.length) return null;

  // Prefer matches from the user's selected show
  const bestEp = preferredShow
    ? (epMatches.find(m => m.showName === preferredShow) ?? epMatches[0])
    : epMatches[0];
  const bestVocab = preferredShow
    ? (vocabMatches.find(m => m.showName === preferredShow) ?? vocabMatches[0])
    : vocabMatches[0];

  const match = bestEp ?? bestVocab;
  const s     = match.show;
  const sNum  = match.season  ? String(match.season).padStart(2,  '0') : null;
  const eNum  = match.episode ? String(match.episode).padStart(2, '0') : null;

  return {
    showName:       match.showName,
    showId:         s.id,
    emoji:          s.emoji         ?? '📺',
    gradient:       s.gradient      ?? 'from-slate-700 to-slate-900',
    bgColor:        s.bgColor       ?? 'bg-slate-800/50',
    borderColor:    s.borderColor   ?? 'border-slate-600/40',
    description:    s.description   ?? '',
    season:         match.season    ?? null,
    episode:        match.episode   ?? null,
    episodeLabel:   sNum ? `S${sNum}E${eNum}` : null,
    summary:        match.summary   ?? null,
    imageAsset:     null, // reserved for future poster/screenshot support
    characterName:  null, // reserved for future quote database
  };
}

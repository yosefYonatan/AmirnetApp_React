# Feature Spec: User XP & Leveling System
**Status:** Draft
**Author:** BMAD Analyst
**Date:** 2026-03-20
**Project:** Amirnet TV (React + Supabase)

---

## 1. Problem Statement

The app already awards raw XP points from three sources — battles, flashcard swipes, and exams — and displays a total on the leaderboard. However, there is no sense of **progression**. A user with 500 XP and one with 50 XP look identical except for a number. There is no milestone to reach, no reward to celebrate, and no motivation to return after a session.

This feature adds a **level system** on top of the existing XP infrastructure, turning an abstract number into a visible, meaningful journey.

---

## 2. Goals

| # | Goal |
|---|------|
| G1 | Convert raw XP into discrete levels with a name and visual badge |
| G2 | Show the user's current level + progress to next level in the Profile dropdown and Leaderboard |
| G3 | Trigger a full-screen level-up celebration when a threshold is crossed |
| G4 | Keep the implementation **purely client-side** — no new Supabase columns needed |
| G5 | Support both RTL Hebrew labels and LTR numbers correctly |

## 3. Non-Goals

- Social features (following, comparing levels with friends) — future scope
- XP decay or time-based penalties
- Changing how XP is earned (amounts stay the same)
- Separate level tracks per activity (one unified level)
- Backend enforcement of level (purely display/UX layer)

---

## 4. User Stories

### US-01 · See my level
> As a logged-in student, I want to see my current level next to my XP total, so I know where I stand in my learning journey.

**Acceptance Criteria:**
- [ ] Profile dropdown (in Header/App.jsx `ProfileButton`) shows level badge + name beneath XP
- [ ] Leaderboard row for each user shows their level badge (icon + number)
- [ ] Level is computed deterministically from `xp_points` — no server round-trip needed

---

### US-02 · See progress to next level
> As a student, I want to see a progress bar showing how close I am to the next level, so I feel motivated to keep studying.

**Acceptance Criteria:**
- [ ] Profile dropdown shows a thin XP progress bar: `[===----] 340 / 500 XP לרמה 6`
- [ ] Bar fills left-to-right (LTR inside an RTL layout — use `dir="ltr"` on the bar)
- [ ] At max level the bar shows "רמה מקסימלית" and is fully filled

---

### US-03 · Level-up celebration
> As a student, when I cross a level threshold during any activity, I want a celebration screen so I feel rewarded.

**Acceptance Criteria:**
- [ ] A full-screen overlay appears for ~3 seconds showing: level number, level name, confetti/stars
- [ ] Overlay appears regardless of which page triggered the XP award (battle, flashcards, exam)
- [ ] User can tap to dismiss early
- [ ] Does NOT fire on app load / profile refresh — only on a live XP gain during the session

---

### US-04 · Level visible on Leaderboard
> As a student browsing the leaderboard, I want to see everyone's level, so I can understand the skill gap at a glance.

**Acceptance Criteria:**
- [ ] Each leaderboard row displays the level badge (colored icon + level number) next to XP
- [ ] Badge color matches the tier (see Level Table below)
- [ ] Existing rank medals (🥇🥈🥉) are kept; level badge is a secondary indicator

---

## 5. Level Table

All thresholds are cumulative XP. Levels are computed by the shared `getLevelInfo(xp)` utility.

| Level | XP Threshold | Hebrew Name | English Name | Badge Color |
|-------|-------------|-------------|--------------|-------------|
| 1 | 0 | מתחיל | Beginner | `slate` |
| 2 | 100 | לומד | Learner | `blue` |
| 3 | 250 | סקרן | Curious | `cyan` |
| 4 | 500 | מתקדם | Advanced | `indigo` |
| 5 | 900 | מיומן | Skilled | `purple` |
| 6 | 1 400 | מומחה | Expert | `fuchsia` |
| 7 | 2 000 | אלוף | Champion | `amber` |
| 8 | 3 000 | אגדה | Legend | `orange` |
| 9 | 5 000 | גאון | Genius | `red` |
| 10 | 8 000 | מאסטר | Master | `yellow` (gold) |

**Formula** (inside `getLevelInfo`):
```js
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

// Returns: { level, name, color, currentXP, nextThreshold, progress (0–1), isMax }
export const getLevelInfo = (xp = 0) => { ... };
```

---

## 6. Data Model

**No schema changes required.**

The existing `profiles` table already has `xp_points INTEGER`. Levels are computed on the client from this value using the shared utility.

### Existing XP sources (unchanged):

| Source | Points | Location |
|--------|--------|----------|
| Battle — correct answer (fast) | +15 | `BattlePage.jsx` → `handleAnswer` |
| Battle — correct answer (slow) | +10 | `BattlePage.jsx` → `handleAnswer` |
| Battle — end of game | `score × 1` via `awardXP(myScore)` | `BattlePage.jsx` useEffect |
| Flashcards — per 10 swipes | +5 | `FlashcardsPage.jsx` → `decide` |
| Exam — per correct answer | +10 | `ExamPage.jsx` (assumed) |

---

## 7. Architecture & Implementation Plan

### 7.1 New utility: `src/utils/levelSystem.js`
Pure functions, no React, no Supabase. Zero dependencies.
```
getLevelInfo(xp) → { level, name, color, currentXP, nextThreshold, progress, isMax }
LevelBadge component (can live here as a small JSX helper or in components/)
```

### 7.2 New component: `src/components/LevelUpOverlay.jsx`
- Triggered by `VocabContext` detecting XP crossing a threshold
- Props: `{ level, name, onDismiss }`
- CSS animation: stars burst (reuse `BattleStyles` keyframes) + scale-in card
- Auto-dismiss after 3 000 ms

### 7.3 Modified: `src/context/VocabContext.jsx`
- Add `levelUpEvent` state: `null | { level, name }`
- In `awardXP`: after updating `supabaseProfile.xp_points`, compare old level vs new level using `getLevelInfo`. If `newLevel > oldLevel`, set `levelUpEvent`.
- Export `levelUpEvent` and `clearLevelUpEvent` in context value.

### 7.4 Modified: `src/App.jsx`
- Import `LevelUpOverlay` and `useVocab`
- Render `<LevelUpOverlay>` inside `ThemedApp` when `levelUpEvent !== null`

### 7.5 Modified: `src/App.jsx` → `ProfileButton`
- Import `getLevelInfo`
- Below the `⚡ {xp} XP` line, add:
  - Level badge: colored pill with level number + name
  - Progress bar (LTR) with label `{currentXP} / {nextThreshold} XP`

### 7.6 Modified: `src/pages/LeaderboardPage.jsx`
- Import `getLevelInfo`, `LevelBadge`
- In each leaderboard row, add a small level badge next to the XP number
- Update the "how to earn XP" info card to mention levels

---

## 8. UI Specification

### LevelBadge (small, used in rows)
```
[ Lv.4 מתקדם ]
```
- Colored border + background matching the level color
- `text-[10px] font-black px-2 py-0.5 rounded-full`
- Used inline in Leaderboard rows and Profile dropdown

### Profile dropdown — XP section
```
⚡ 720 XP
[ Lv.4 · מתקדם ]
[=========---] 220 / 400 XP לרמה 5
```

### LevelUpOverlay (full-screen modal)
```
╔══════════════════════════╗
║    ⭐ עלית רמה! ⭐         ║
║                          ║
║      🏆  רמה 5           ║
║        מיומן             ║
║                          ║
║  המשך כך — אתה מדהים!   ║
║                          ║
║   [הבנתי, נמשיך!]        ║
╚══════════════════════════╝
```
- Backdrop: `bg-black/70`
- Card: `bg-gradient-to-br from-indigo-900 to-purple-900 border border-indigo-500/40`
- Star burst animation (same keyframes as BattlePage)
- Auto-dismiss after 3s, or tap anywhere

---

## 9. Edge Cases

| Case | Handling |
|------|----------|
| User opens app with existing XP above a threshold | No level-up toast — only fire on live XP gain |
| XP decrements (future feature) | `getLevelInfo` handles gracefully; no negative levels |
| Max level (8 000+ XP) | Progress bar shows "רמה מקסימלית", no "next" threshold |
| Supabase profile not loaded yet | `getLevelInfo(0)` shows level 1 — safe default |
| Multiple XP gains skipping 2+ levels | Fire overlay for the FINAL reached level only |
| Guest user (no Supabase) | `getLevelInfo` still computes from `xp_points = 0`; overlay never fires (no `awardXP` without auth) |

---

## 10. Out of Scope

- Level-gated content (unlocking units or features by level)
- XP multipliers or boosts
- Level-up push notifications
- Storing level in Supabase (computed client-side only)
- Admin tools for adjusting XP

---

## 11. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| OQ-1 | Should the level badge appear on the NavBar battle icon for the active user? | Product | Open |
| OQ-2 | Should there be a dedicated Profile/Stats page showing full XP history? | Product | Open |
| OQ-3 | Does the XP info card on LeaderboardPage need to be updated to list all level thresholds? | Design | Open |
| OQ-4 | Should level names be shown in English, Hebrew, or bilingual? | Product | **Hebrew preferred** (see table) |

---

## 12. Acceptance Test Checklist

- [ ] Fresh user (0 XP) sees "רמה 1 · מתחיל" in Profile dropdown
- [ ] Profile dropdown shows correct XP progress bar filling
- [ ] After a battle win that pushes XP past 100, level-up overlay appears exactly once
- [ ] Overlay auto-dismisses after ~3 seconds; tapping dismisses immediately
- [ ] Overlay does NOT re-appear on next page load
- [ ] Leaderboard rows show a level badge for every user
- [ ] User at 8 000+ XP sees "רמה מקסימלית" — no broken progress bar
- [ ] Light mode and dark mode — all level colors are readable
- [ ] RTL layout: progress bar fills left-to-right (`dir="ltr"` on bar element)
- [ ] No new Supabase migrations required to run this feature

---

## 13. Files To Create / Modify

| Action | File |
|--------|------|
| **CREATE** | `src/utils/levelSystem.js` |
| **CREATE** | `src/components/LevelUpOverlay.jsx` |
| **MODIFY** | `src/context/VocabContext.jsx` — add `levelUpEvent`, `clearLevelUpEvent` |
| **MODIFY** | `src/App.jsx` — render overlay, update `ProfileButton` |
| **MODIFY** | `src/pages/LeaderboardPage.jsx` — add level badges to rows |

**No SQL migrations. No new npm packages.**

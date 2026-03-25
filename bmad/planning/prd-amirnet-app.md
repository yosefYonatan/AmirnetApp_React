# PRD — Amirnet TV
**Version:** 1.0 | **Status:** Active Source of Truth
**Role:** BMAD Lead Analyst & Product Manager
**Last Updated:** 2026-03-25

---

## 1. Executive Summary

Amirnet TV is a B2B2C EdTech platform built for Israeli students preparing for the Amirnet/Psychometric English exam. It attacks the #1 cause of exam failure — **vocabulary dropout** — by replacing traditional dry memorization with contextual learning tied to TV shows, real-time multiplayer battles, and an AI-powered personal tutor.

The core insight: students already spend 3–5 hours daily watching English-language content. Amirnet TV intercepts that existing behavior and turns it into learning, instead of demanding additional study time they don't have.

**Target Users:**
- **B2C:** Israeli students aged 17–28 preparing for Psychometric/Amirnet exams
- **B2B:** Prep schools, university coaching programs, tutors managing cohorts

**Tech Stack:** React 19 + Vite, Tailwind CSS (RTL, dark/light), Supabase (Auth, Realtime, RLS), Claude AI API

---

## 2. Problem Statement

### The Crisis
- ~120,000 Israelis take the Psychometric exam annually
- English vocabulary is the highest-variance section — students either ace it or collapse
- Existing prep tools (Bagrut books, Quizlet) have a **~60% dropout rate within 2 weeks**
- Root cause: rote flashcard memorization is cognitively disconnected from real language use

### Why Existing Solutions Fail
| Solution | Why It Fails |
|---|---|
| Quizlet | No gamification, no Israeli context, English UI |
| Duolingo | Wrong level, wrong goal, not Psychometric-aligned |
| Prep books | Static, no feedback, no engagement loop |
| Private tutors | Expensive, not scalable, same dropout risk |

### The Opportunity
A product that meets students in their existing entertainment habits (Netflix, YouTube, Spotify) and gamifies vocabulary learning with social competition has an uncaptured market of 120,000+ annual users with institutional buying power.

---

## 3. The 5 Core Product Pillars

---

### Pillar 1 — Contextual Learning (The Netflix/TV Sync)

**Problem it solves:** Words learned in isolation are forgotten within 24 hours (Ebbinghaus curve). Words learned in emotional, narrative context are retained 3–5× longer.

**Mechanism:**

The app maps the 1,058 core Amirnet vocabulary words against subtitle databases of popular English-language TV shows. When a user watches an episode, the app surfaces the exact scene where a target word appears in natural dialogue.

**Current Implementation:**
- `showsDB.js` contains curated vocabulary sets per show (HIMYM, Friends, Suits, The Office, Breaking Bad)
- Each show has themed vocabulary aligned with its narrative domain (e.g., HIMYM: romance/NYC; Suits: legal/corporate)
- Episode metadata links words to specific scenes with timestamps
- `WatchPage` allows users to mark words encountered while watching

**AI Sentence Generator:**
- Given a word + show context, calls Claude API to generate an example sentence in the voice and style of that show
- Example: `"elaborate"` + HIMYM → *"Barney's elaborate scheme to get a date involved three decoys and a fog machine."*
- Sentences are cached per word+show combination to reduce API cost

**Future Scope (Pillar 1 Roadmap):**
- **Spotify/Apple Music Integration:** Real-time detection of Amirnet words in currently playing songs via lyrics API. Push notification: *"'inevitable' הופיע עכשיו בשיר — אחי, זכור אותו!"*
- **Visual Context (AI Memes):** Claude Vision generates a meme or image for each word using the show's aesthetic, making the memory hook visual and shareable
- **Netflix Subtitle Scanner:** Browser extension that highlights Amirnet words in real-time Netflix subtitles

---

### Pillar 2 — 1v1 Battle Mode (The Engagement Engine)

**Problem it solves:** Solo studying has no accountability and no emotional stakes. Adding a live human opponent creates urgency, social pressure, and a reason to return.

**Battle Flow (Current State):**

```
Landing → [Create Room | Join Room | vs Bot]
       → CategorySelector (word set selection)
       → UnitSelector (for General category)
       → Room created → Lobby (share code, wait for players)
       → PreBattleFlash (10s word preview)
       → GameScreen (real-time Q&A)
       → WaitingRoom (faster player waits)  ← PLANNED
       → ResultsScreen
       → BattleReviewScreen (per-word breakdown)  ← PLANNED
```

**Real-Time Architecture (Supabase):**

```
Tables:
  battle_rooms    { id, status, word_unit, questions, admin_name,
                    question_time_ms, creator_id, category }
  battle_players  { id, room_id, name, score, is_admin, user_id,
                    is_done, answers_log }  ← is_done & answers_log: PLANNED

Realtime Channels:
  battle_{roomId}  — subscribes to both tables
  Events:
    battle_rooms.status = 'playing'   → all clients start flash
    battle_rooms.status = 'finished'  → all clients show results
    battle_players.*                  → score updates, is_done updates
```

**Category Selection (PLANNED):**

Before room creation, host selects a Vocabulary Set:
- **General Psychometric** — 1,058 words split into 50-word units (current default)
- **TV Show Sets** — HIMYM, Friends, Suits, The Office, Breaking Bad (from `showsDB.js`)

Category stored in `battle_rooms.category`. Joining players see the selected category in the Lobby. `pickQuestions()` dispatches to the correct word source based on category.

**Waiting Room (PLANNED):**

When a player finishes their last question before others:
- Their client sets `battle_players.is_done = true` and moves to `screen = 'waiting'`
- `WaitingScreen` shows their current score + animated "ממתין לשחקנים..." indicator
- First player to set `is_done = true` checks: if all players in room also have `is_done = true`, they update `battle_rooms.status = 'finished'`
- All clients' existing Realtime subscription picks up the status change and transitions to results
- Bot mode bypasses waiting room (single real player → direct to results)

**Post-Battle Review Screen (PLANNED):**

After `ResultsScreen`, a "סיכום מפורט" button opens `BattleReviewScreen`:
- Lists every word from the battle
- Per row: word | correct answer | your answer (✓/✗) | opponent's answer (✓/✗)
- Highlighted rows: you wrong + opponent right = learning priority
- "הוסף לתיקיית חולשות" button pushes highlighted words to the SRS Weakness Folder

**Scoring Logic:**
- Correct answer: **+15 XP** if answered in top 80% of time window, **+10 XP** otherwise
- Wrong answer or timeout: **0 XP**
- Final battle XP = total score, awarded via `awardXP(score)` at results screen

---

### Pillar 3 — The "Personal AI Brain" (SRS & Retention)

**Problem it solves:** Reviewing words you already know wastes time. Reviewing too late means they're already forgotten. SRS solves this with mathematical precision.

**Spaced Repetition System (SM-2 Algorithm):**

Each word-user pair has a memory record:
```
{ word, easeFactor, interval, repetitions, nextReview, lastResult }
```

After each interaction (flashcard swipe, battle answer, exam question):
- `easeFactor` adjusts based on result quality (0–5 scale)
- `interval` = days until next review (starts at 1 day, grows exponentially for correct answers)
- `nextReview` = today + interval

Words due for review are surfaced first in Flashcards sessions (unknown → uncertain → unrated → known ordering already implemented in `buildSession()`).

**Current Implementation:**
- `src/services/srsAlgorithm.js` exists — contains SM-2 logic
- `wordStatuses` in VocabContext tracks KNOWN/UNKNOWN/UNCERTAIN per word
- SRS intervals not yet persisted to Supabase (stored locally)

**Weakness Folders:**

Dynamically generated folder per user containing their worst-performing words. Criteria:
- Answered wrong 2+ times in battles
- Forgotten (status reverted from KNOWN to UNKNOWN) after SRS interval
- Low ease factor (< 1.8) in SM-2

Folders auto-update after each session. Users can also manually add words. Folder contents can be shared with teachers.

**Smart Push Notifications (PLANNED):**

Instead of generic "time to study!" alerts, notifications contain an actual quiz:
- *"מה המשמעות של 'inevitable'? א) בלתי נמנע ב) מורכב ג) זמני"*
- User answers inline from the notification (iOS/Android action buttons)
- Answer is recorded, SRS updated, streak maintained — without opening the app
- Timing: fired when SRS algorithm predicts forgetting is imminent (interval - 2 hours)

**Voice Challenges (Future Scope):**
- User records pronunciation of a word
- Claude AI audio API evaluates accent, stress, phoneme accuracy
- Feedback: *"אחי, 'entrepreneur' — שים לב על ה-'eur' בסוף, זה לא 'אנטרפרנור'"*

---

### Pillar 4 — "Blue-and-White" Localization

**Problem it solves:** Global apps are built for global audiences. Israeli Gen-Z students have a specific cultural voice, humor register, and language style. Generic UX copy creates distance.

**Principles:**

1. **Gen-Z Hebrew Copy:** Every error message, encouragement, and label uses accessible, slangy Hebrew
   - Not: *"שגוי. נסה שוב."* → Yes: *"אחי, פספסת — בוא ניסה שוב 💪"*
   - Not: *"כל הכבוד על הסיום."* → Yes: *"סיימת? מגה-חלאק-ע! 🔥"*
   - Not: *"מילה לא ידועה"* → Yes: *"עוד לא שלטת בזה, בסדר — נחזור אליה"*

2. **False Friends Mini-Challenges:**
   - Israeli students make predictable errors from Hebrew-English phonetic similarity ("Hebronish")
   - Examples: *actual* (not "בפועל" but "ממשי"), *eventually* (not "אבנצ'ואלי" but "בסופו של דבר"), *sympathetic* (not "סימפטי/נחמד" but "אמפתי")
   - Dedicated `falseFriendsDB.js` exists with curated pairs
   - Mini-game: shown a false friend pair, must identify which is the correct translation
   - Integrated into daily session as a 3-question warm-up

3. **RTL-First Design:**
   - All layouts are `dir="rtl"` by default
   - English words explicitly marked `dir="ltr"` inline
   - NavBar, dropdowns, modals all RTL-native

4. **Exam Alignment:**
   - Vocabulary drawn from official Psychometric/Amirnet word lists, not generic English frequency lists
   - Difficulty tiers match actual exam sections

---

### Pillar 5 — B2B Teacher & Admin Dashboard (The Monetization Engine)

**Problem it solves:** Institutions (prep schools, university programs) need data to justify the subscription cost and to intervene before students drop out.

**Dashboard Modules:**

**Class Heatmap:**
- Visual grid: rows = students, columns = word units
- Cell color = performance score (red = failing, green = mastered)
- Instant identification of systemic weaknesses (e.g., "every student in this cohort fails unit 7 — the abstract nouns unit")
- Exportable as CSV for institutional reporting

**Dropout Risk Alerts:**
- Algorithm flags students with:
  - Streak broken AND no login in 3+ days
  - Session completion rate < 40% in the past week
  - Battle XP dropping (declining engagement trend)
- Teacher receives alert: *"דניאל לוי לא נכנס 4 ימים — שבירת סטריק. מומלץ לפנות."*

**Cross-Branch Comparison:**
- For chains with multiple branches (e.g., Kidum prep school network)
- Leaderboard of branches by average word mastery, streak maintenance, battle win rate
- Drives internal competition between branches

**Student Spotlight:**
- Per-student deep drill: session history, XP curve, worst words, time-of-day engagement patterns
- Teacher can assign specific word folders to a student

**Monetization Model:**
- B2C: Freemium — free first 200 words, subscription for full access (~₪49/month)
- B2B: Per-seat institutional license (~₪29/student/month for 20+ seats)
- Teacher dashboard is B2B-only (no dashboard access on free tier)

---

## 4. Gamification & Economy System

### XP & Levels

10-tier leveling system (defined in `src/utils/levelSystem.js`):

| Level | Name (Hebrew) | XP Range | Color |
|---|---|---|---|
| 1 | מתחיל | 0 – 99 | Gray |
| 2 | מתרגל | 100 – 249 | Blue |
| 3 | מתקדם | 250 – 499 | Indigo |
| 4 | מיומן | 500 – 899 | Purple |
| 5 | מקצוען | 900 – 1,399 | Pink |
| 6 | אלוף | 1,400 – 2,099 | Rose |
| 7 | מומחה | 2,100 – 2,999 | Orange |
| 8 | אגדה | 3,000 – 4,199 | Amber |
| 9 | גאון | 4,200 – 5,999 | Yellow |
| 10 | אמירנט מאסטר | 6,000+ | Gold |

**XP Sources:**
- Flashcard swipe session: **+5 XP per 10 swipes**
- Battle correct answer (fast): **+15 XP**
- Battle correct answer (slow): **+10 XP**
- Daily login streak bonus: **+2 XP/day** (multiplied by streak length, capped at 7×)
- Completing a full flashcard session (20 cards): **+10 XP bonus**

**Level-Up Event:**
- `LevelUpOverlay.jsx` triggers on level-up (detected in `awardXP` via `getLevelInfo()`)
- Full-screen particle burst, auto-dismisses after 3 seconds
- `levelUpEvent` state in VocabContext, `clearLevelUpEvent` callback (stable `useCallback`)

### Streaks & Wagers (PLANNED)

**Streak System:**
- Maintained by completing at least one flashcard session or battle per day
- Stored in Supabase: `profiles.streak_days`, `profiles.last_active_date`
- Streak displayed in NavBar/Profile as 🔥 N days

**Streak Wager:**
- User can "wager" up to 20% of their current XP on maintaining a 7-day streak
- If streak maintained: wagered XP × 2 returned
- If streak broken: wagered XP lost
- Creates emotional investment and daily return behavior

### Hyper-Local Leaderboards

Beyond the global leaderboard (already built in `LeaderboardPage.jsx`):

**Institution Leaderboards:**
- User sets their institution on signup (BGU, Technion, TAU, etc.) and faculty/department
- Leaderboard filtered to institution + faculty
- Weekly reset with trophy ceremony notification
- Cross-institution battles: *"אוניברסיטת ב"ג vs הטכניון — מי ינצח השבוע?"*

**Why this works:** Social comparison within a specific peer group (classmates, rivals in the same degree program) is the strongest known driver of sustained engagement in edtech.

### Blitz Mode (PLANNED)

60-second rapid-fire translation mini-game:
- Continuous stream of words, one every ~4 seconds
- No multiple choice — type the Hebrew translation
- Score = number correct × accuracy multiplier
- Leaderboard resets daily
- Unlocks at Level 3 (requires minimum XP investment to access)
- High Blitz scores award XP and a special "⚡ Blitz" badge on the leaderboard

---

## 5. Technical UX Logic — Flashcards (Tinder-Style Swipe) Module

This section is the authoritative specification for the swipe card feature. It serves as the QA standard against which all implementation is audited.

---

### 5.1 Component Architecture

**File:** `src/pages/FlashcardsPage.jsx` (monolithic — no TinderCards component)

**No Framer Motion is used.** All animation is pure CSS transforms + transitions via React inline styles. This is intentional — Framer Motion adds bundle weight and its `drag` API conflicts with Pointer Events on certain mobile browsers.

**Card Stack Visual Model:**
```
Z-index 4 → Active card (draggable, receives all pointer events)
Z-index 2 → Second card (decorative, translateY +10px, scale 0.96, opacity 0.85)
Z-index 1 → Third card (decorative, translateY +20px, scale 0.92, opacity 0.65)
```

### 5.2 Z-Index Lifecycle

| State | Active Card Z | Second Card Z | Third Card Z |
|---|---|---|---|
| Idle | 4 | 2 | 1 |
| Dragging | 4 (unchanged) | 2 | 1 |
| Flying off (320ms) | 4 (translating out) | 2 | 1 |
| After advance (new currentIdx) | 4 (new word, reset position) | 2 | 1 |

Z-indexes never change. The "stack shuffle" effect is purely from `currentIdx` advancing — new words slide into their positions because React re-renders with new data, not because z-indexes are swapped.

**Stack card key rule:** Keys MUST be based on word content (`word.word`), NOT on index arithmetic (`currentIdx + offset`). Index arithmetic causes React to unmount/remount stack cards on every swipe, producing a flash.

### 5.3 Drag Interaction States & Transform Specification

**State: Idle**
```
transform:  translateX(0px) rotate(0deg)
transition: transform 0.25s ease
cursor:     grab
```

**State: Dragging (pointer down + moved > 6px)**
```
transform:  translateX({dragX}px) rotate({dragX * 0.05}deg)
transition: none   ← CRITICAL: no transition during active drag
cursor:     grabbing
```
The `0.05deg/px` rotation creates organic tilt. At max comfortable drag (~100px), card tilts 5 degrees.

**State: Flying Off Left**
```
transform:  translateX(calc(-100vw - 100%)) rotate(-25deg)
transition: transform 320ms cubic-bezier(0.4, 0, 1, 1)
```

**State: Flying Off Right**
```
transform:  translateX(calc(100vw + 100%)) rotate(25deg)
transition: transform 320ms cubic-bezier(0.4, 0, 1, 1)
```

**CRITICAL — Why `calc(±(100vw + 100%))` and NOT `±160%`:**

`translateX(%)` is relative to the element's OWN width, not the viewport. The card is `max-w-sm` (384px) centered on a 1366px desktop — its left edge starts at ~507px from the viewport edge. At `-160%` of a 352px card = only -563px, placing the card's right edge at **+299px — still visible on screen**. The card appears "stuck in the upper corner" because a 299px-wide strip remains visible combined with the -25deg rotation. `calc(-100vw - 100%)` guarantees the card clears the viewport on any screen size.

**State: Snap Back (released below swipe threshold)**
```
setDragX(0) + setIsDragging(false) in same React batch
→ transform:  translateX(0px) rotate(0deg)
→ transition: transform 0.25s ease   ← animates back because isDragging=false
```

**State: Hint Overlays (during drag)**
```
Right hint (dragX > 30):  opacity = min((dragX - 30) / 80, 1)
Left hint  (dragX < -30): opacity = min((-dragX - 30) / 80, 1)
```
Overlays fade in as the card approaches the threshold. At threshold (80px), opacity = 100%.

### 5.4 Pointer Event Cleanup Specification

**Architecture Rule:** Only `pointerdown` is attached to the card element. All subsequent events (`pointermove`, `pointerup`, `pointercancel`) are attached to `window` via `useEffect([], [])`. This is the industry-standard drag pattern — it guarantees event delivery regardless of where the pointer physically goes.

**Required Refs (all must exist):**
```js
dragStartX     = useRef(0)        // pointer x at drag start
dragStartY     = useRef(0)        // pointer y at drag start (for vertical rejection)
totalPathRef   = useRef(0)        // ACCUMULATED path length (not net displacement)
prevClientX    = useRef(0)        // previous frame x, for path accumulation
dragXRef       = useRef(0)        // current net X displacement (mirror of dragX state)
isDraggingRef  = useRef(false)    // mirror of isDragging (for window handlers, no stale closure)
activePtrId    = useRef(null)     // the pointerId that started the current drag
decideRef      = useRef(null)     // always points to latest decide() function
flyTimeoutRef  = useRef(null)     // setTimeout handle for the fly-off → advance transition
xpMilestoneRef = useRef(0)        // XP milestone counter (avoids stale closure in setSwiped)
```

**`onPointerDown` (on card element):**
```
1. if (isFlyingOff) return              // block new drag during fly-off
2. if (isDraggingRef.current) return    // block second finger starting a new drag
3. activePtrId.current = e.pointerId   // track which finger owns this drag
4. dragStartX.current  = e.clientX
5. dragStartY.current  = e.clientY
6. prevClientX.current = e.clientX
7. totalPathRef.current = 0
8. dragXRef.current = 0
9. isDraggingRef.current = true
10. setDragX(0)
11. setIsDragging(true)
// NO setPointerCapture — window handlers make it unnecessary
```

**`onMove` (window, registered once):**
```
1. if (!isDraggingRef.current) return
2. if (e.pointerId !== activePtrId.current) return    // ignore other fingers
3. const dx = e.clientX - dragStartX.current          // net X
4. const dy = e.clientY - dragStartY.current          // net Y
5. totalPathRef.current += Math.abs(e.clientX - prevClientX.current)
6. prevClientX.current = e.clientX
7. // Vertical scroll rejection (first 20px of gesture):
   if (totalPathRef.current < 20 && Math.abs(dy) > Math.abs(dx) * 1.5) {
     onCancel(); return;   // release drag, let browser scroll
   }
8. dragXRef.current = dx
9. setDragX(dx)
```

**`onUp` (window, registered once):**
```
1. if (!isDraggingRef.current) return
2. if (e.pointerId !== activePtrId.current) return
3. isDraggingRef.current = false
4. activePtrId.current = null
5. setIsDragging(false)
6. const finalDx = dragXRef.current
7. if (totalPathRef.current < 6):
     setDragX(0); setFlipped(f => !f)   // tap → flip
   else if (finalDx > SWIPE_THRESHOLD):
     decideRef.current?.('right')
   else if (finalDx < -SWIPE_THRESHOLD):
     decideRef.current?.('left')
   else:
     setDragX(0)                         // snap back
```

**`onCancel` (window, registered once):**
```
1. isDraggingRef.current = false
2. activePtrId.current = null
3. setIsDragging(false)
4. setDragX(0)
5. dragXRef.current = 0
6. totalPathRef.current = 0
```

**`decide(direction)` — fly-off + advance:**
```
1. if (isFlyingOff) return              // guard against double-call
2. if (!sessionWords[currentIdx]) return
3. capture capturedIdx = currentIdx     // freeze values in closure
4. capture capturedTotal = sessionWords.length
5. setIsFlyingOff(direction)            // triggers CSS fly-off animation
6. setWordStatus(word, status)
7. setSwiped(prev → ...) with xpMilestoneRef for XP
8. flyTimeoutRef.current = setTimeout(() => {
     setIsFlyingOff(null)
     setDragX(0)
     setFlipped(false)
     if (capturedIdx + 1 >= capturedTotal) setDone(true)
     else setCurrentIdx(capturedIdx + 1)
   }, FLY_DURATION_MS)                  // stored in ref so startSession can cancel it
```

**`startSession` — must cancel any in-flight timeout:**
```
1. clearTimeout(flyTimeoutRef.current)  // cancel pending advance
2. isDraggingRef.current = false        // reset drag state
3. activePtrId.current = null
4. setDragX(0)
5. setIsFlyingOff(null)
6. ... (rest of session reset)
```

**`touch-action` placement rule:**
`style={{ touchAction: 'none' }}` MUST be on BOTH:
1. The container div (`relative h-72 ...`)
2. The active card div itself

`touch-action` is not inherited. Without it on the card element, mobile browsers fire `pointercancel` after detecting horizontal movement as a potential scroll, causing the card to snap back before a swipe can commit.

---

### 5.5 Known Bugs & Required Fixes (Audit vs. This Spec)

| Bug ID | Severity | Current Code | This Spec Requires | Fix |
|---|---|---|---|---|
| B01 | CRITICAL | `translateX(±160%)` | `translateX(calc(±(100vw + 100%)))` | Card stays partially visible on desktop |
| B02 | CRITICAL | `touchAction` on container only | Also on active card div | Mobile `pointercancel` fires mid-swipe |
| B03 | HIGH | No `pointerId` tracking | `activePtrId` ref, filter in all handlers | Multi-touch corrupts drag direction |
| B04 | HIGH | `key={currentIdx + offset}` | `key={word.word ?? offset}` | Stack cards remount on every swipe |
| B05 | MEDIUM | `totalDragged = Math.abs(dx)` (net) | `totalPathRef` (accumulated path) | Circular gesture triggers unintended flip |
| B06 | MEDIUM | `dragStartY` unused | Used for vertical scroll rejection | Vertical scroll starts accidental drag |
| B07 | MEDIUM | `startSession` doesn't reset `isDraggingRef` | Must reset `isDraggingRef.current = false` | Mid-drag session reset leaves stale drag state |

---

## 6. Feature Specifications (Current Modules)

### 6.1 Navigation (NavBar)

7 tabs: Watch, Leaderboard, Battle, Folders, Exam, Flashcards, Words

- Active tab highlighted with `bg-blue-600`
- `h-14` height, `text-[8px]` labels, `size={15}` icons
- Solid `bg-white / dark:bg-slate-950` (no backdrop-blur)
- `dir="rtl"` layout

### 6.2 Vocabulary Management (VocabContext)

Central state manager:
- `wordStatuses`: `{ [word]: 'known' | 'unknown' | 'uncertain' }` — synced to Supabase `word_statuses` table
- `xp_points`: fetched from `profiles` table
- `awardXP(amount)`: calls RPC `increment_xp`, detects level-up, fires `levelUpEvent`
- `setWordStatus(word, status)`: optimistic local update + Supabase upsert

### 6.3 Flashcards (Tinder Swipe)

See Section 5 for complete technical specification.

Session configuration:
- `SESSION_SIZE = 20`
- `SWIPE_THRESHOLD = 80px`
- `FLY_DURATION_MS = 320ms`
- Word ordering: unknown → uncertain → unrated (known words excluded)
- XP: +5 per 10 swipes, tracked via `xpMilestoneRef`

### 6.4 Battle Mode

See Pillar 2 for complete specification.

Current screens: `landing → unit → lobby → flash → game → results`
Planned screens: `landing → category → unit → lobby → flash → game → waiting → results → review`

### 6.5 Leaderboard

- Fetches top 50 users by `xp_points` from `profiles`
- Displays level badge (`getLevelInfo(xp)`) per row
- Shows current user's rank (even if outside top 50)
- Lists XP sources and all 10 level names

### 6.6 Exam Page (Practice Tests)

Multiple-choice questions from `academicDB.json` in exam format.
Time-limited, scored, results stored locally.

### 6.7 Watch Page

- Show browser with episode grid from `showsDB.js`
- EpisodeModal with word list per episode
- Vocabulary logging — words encountered while watching are marked
- AI sentence generation (Claude API integration point)

### 6.8 Folders

User-created and auto-generated (Weakness Folders) word collections.
Study mode available per folder.

---

## 7. Data Model (Supabase)

### Tables

```sql
profiles
  id             uuid PK (= auth.users.id)
  full_name      text
  xp_points      int DEFAULT 0
  streak_days    int DEFAULT 0
  last_active    date
  institution    text
  faculty        text
  avatar_url     text

word_statuses
  id             uuid PK
  user_id        uuid FK profiles
  word           text
  status         text CHECK (known|unknown|uncertain)
  updated_at     timestamptz
  UNIQUE(user_id, word)

battle_rooms
  id             text PK (6-char code)
  status         text CHECK (waiting|playing|finished)
  word_unit      int
  category       text DEFAULT 'general'
  questions      jsonb
  admin_name     text
  question_time_ms int
  creator_id     uuid FK profiles

battle_players
  id             uuid PK
  room_id        text FK battle_rooms
  user_id        uuid FK profiles (nullable for guests)
  name           text
  score          int DEFAULT 0
  is_admin       bool
  is_done        bool DEFAULT false    ← PLANNED (for waiting room)
  answers_log    jsonb                 ← PLANNED (for battle review)
```

### RLS Policies

- `word_statuses`: user can only read/write their own rows
- `battle_rooms`: anyone can read; only `creator_id` can update status
- `battle_players`: anyone can read room players; player can only update their own row (matched by `user_id`)
- `profiles`: user can read all (for leaderboard); can only update own row

### RPC Functions

```sql
increment_xp(user_id uuid, amount int)
  → UPDATE profiles SET xp_points = xp_points + amount WHERE id = user_id
  → RETURNS new xp_points value
```

---

## 8. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Initial load (mobile 4G) | < 2.5 seconds |
| Flashcard swipe response | < 16ms (60fps) |
| Battle realtime latency | < 300ms P95 |
| Offline flashcard session | Must work without network |
| Accessibility | RTL keyboard navigation, ARIA labels on all interactive elements |
| Dark/Light mode | Full support, no transparent/blurred backgrounds in headers or navbars |
| Bundle size | < 500KB gzipped (no heavy animation libraries) |

---

## 9. Out of Scope (Current Version)

- Native mobile apps (iOS/Android) — PWA only
- Framer Motion or Lottie animation libraries — pure CSS transforms only
- Video playback within the app — WatchPage links to external platforms
- Real-time voice chat during battles
- Teacher dashboard (B2B) — data model ready, UI planned for v2

---

## 10. Planned Feature Roadmap

| Priority | Feature | Pillar | Complexity |
|---|---|---|---|
| P0 | Fix flashcard stuck card (B01–B07) | Tech | Low |
| P0 | Battle waiting room | 2 | Medium |
| P0 | Battle category selection | 2 | Medium |
| P0 | Battle review screen | 2 | Medium |
| P0 | Mobile join room overflow fix | Tech | Low |
| P1 | Post-battle answer broadcast (Supabase) | 2 | High |
| P1 | Streak system + wagers | Gamification | Medium |
| P1 | SRS intervals persisted to Supabase | 3 | Medium |
| P1 | Hyper-local leaderboards | Gamification | Medium |
| P2 | Smart push notifications | 3 | High |
| P2 | False Friends mini-game | 4 | Low |
| P2 | Blitz Mode | Gamification | Medium |
| P2 | Teacher dashboard UI | 5 | High |
| P3 | AI Sentence Generator (Claude) | 1 | Medium |
| P3 | Spotify integration | 1 | High |
| P3 | Voice challenge (Claude Audio) | 3 | High |
| P3 | AI visual context (memes) | 1 | High |
| P3 | Netflix subtitle extension | 1 | Very High |

---

## 11. Success Metrics

| Metric | Current | Target (6 months) |
|---|---|---|
| D7 retention | Unknown | > 40% |
| Sessions per user per week | Unknown | > 4 |
| Battle sessions per DAU | Unknown | > 1.5 |
| Words mastered per user | Unknown | > 200 |
| Streak > 7 days (% of active users) | Unknown | > 25% |
| B2B institutions signed | 0 | 5 |
| Monthly Active Users | Unknown | 1,000 |

---

## 12. Glossary

| Term | Definition |
|---|---|
| Amirnet | Israeli university admissions psychometric exam (English section) |
| SRS | Spaced Repetition System — scheduling algorithm for memory optimization |
| SM-2 | The original SRS algorithm by Piotr Wozniak |
| Weakness Folder | Auto-generated word collection of a user's worst-performing vocabulary |
| Hebronish | Israeli phenomenon of incorrectly translating English words via Hebrew phonetic similarity |
| False Friends | Word pairs that look/sound similar across languages but have different meanings |
| Blitz Mode | 60-second rapid-fire word translation mini-game |
| Flying Off | The CSS animation state where a flashcard exits the screen after a swipe decision |
| isFlyingOff | React state: `'left' | 'right' | null` — controls the fly-off CSS transform |
| flyTimeoutRef | `useRef` storing the `setTimeout` handle for the fly-off → card advance transition |
| activePtrId | `useRef` storing the `pointerId` of the finger that owns the current drag gesture |

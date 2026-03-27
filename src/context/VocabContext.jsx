import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signInAnonymously, onAuthStateChanged, signInWithCustomToken
} from 'firebase/auth';
import {
  collection, doc, setDoc, onSnapshot, addDoc, updateDoc, deleteDoc, getDoc
} from 'firebase/firestore';
import { auth, db, appId, isFirebaseReady } from '../utils/firebase';
import { analyzeWord, fetchOnlineTranslation } from '../utils/wordAnalyzer';
import rawData from '../data/academicDB.json';
import { supabase, isSupabaseReady } from '../services/supabaseClient';
import { computeNextSRS, QUALITY, isDueForReview } from '../services/srsAlgorithm';
import { getLevelInfo } from '../utils/levelSystem';

// Build a fast academicDB lookup for manual word injection
const _academicMap = Object.create(null);
for (const e of rawData) _academicMap[e.word.toLowerCase()] = e;

// Word status constants — used by VocabularyPage V/X/? buttons
export const WORD_STATUS = {
  KNOWN:     'known',
  UNKNOWN:   'unknown',
  UNCERTAIN: 'uncertain',
};

// Subject constants — the three Psychometric pillars
export const SUBJECTS = {
  ENGLISH: 'english',
  MATH:    'math',
  HEBREW:  'hebrew',
};

// ==========================================
// VOCAB CONTEXT — the global brain of the app
//
// Dual backend:
//   • Firebase  — episode word capture (existing)
//   • Supabase  — word statuses, SRS, XP, leaderboard (new)
//
// Auth:  username-only login. Internally uses username@amirnet.app
//        as the Supabase email so users never need a real email.
//
// Offline-first: wordStatuses + SRS metadata saved to
// localStorage so the app works without any backend.
// ==========================================

const VocabContext = createContext(null);

// Local-only word store — used when Firebase is not configured
let localIdCounter = 1;

// ── localStorage helpers ─────────────────────────────────────────────
const LS_STATUSES = 'amirnet_word_statuses';
const LS_SRS      = 'amirnet_word_srs';
const LS_SUBJECT  = 'amirnet_current_subject';
const LS_DAILY    = 'amirnet_daily_stats';

const DAILY_XP_GOAL = 50;
const todayISO = () => new Date().toISOString().slice(0, 10);
const initDailyStats = () => {
  const stored = loadLS(LS_DAILY, null);
  if (!stored || stored.date !== todayISO()) {
    return { date: todayISO(), xp: 0, subjects: [] };
  }
  return stored;
};

const loadLS = (key, fallback) => {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch { return fallback; }
};
const saveLS = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

// Convert a username into the internal fake email used with Supabase Auth.
// Users never see this — it's only used so Supabase's email-required auth works.
const toFakeEmail = (username) =>
  `${username.trim().toLowerCase()}@amirnet.app`;

export const VocabContextProvider = ({ children }) => {
  // ── Firebase state ────────────────────────────────────────────────
  const [user, setUser]                       = useState(null);
  const [isAuthReady, setIsAuthReady]         = useState(!isFirebaseReady);
  const [capturedWords, setCapturedWords]     = useState([]);
  const [selectedShow, setSelectedShow]       = useState(null);
  const [selectedEpisode, setSelectedEpisode] = useState('');
  const [examWords, setExamWords]             = useState([]);
  const [examResults, setExamResults]         = useState(null);

  // ── Supabase state ────────────────────────────────────────────────
  const [supabaseUser, setSupabaseUser]       = useState(null);
  const [supabaseProfile, setSupabaseProfile] = useState(null);
  // true while fetching user_vocabulary from Supabase on login
  const [vocabSyncing, setVocabSyncing]       = useState(false);
  // Set to { level, name } when user crosses a level boundary; cleared by the UI
  const [levelUpEvent, setLevelUpEvent]       = useState(null);

  // ── Word statuses (V/X/?) ─────────────────────────────────────────
  // { [wordLowercase]: 'known' | 'unknown' | 'uncertain' }
  const [wordStatuses, setWordStatusesState] = useState(() => loadLS(LS_STATUSES, {}));

  // ── SRS metadata ──────────────────────────────────────────────────
  // { [wordLowercase]: { nextReviewDate, intervalDays, repetitions, easeFactor } }
  const [wordSRSData, setWordSRSData] = useState(() => loadLS(LS_SRS, {}));

  // ── Daily activity tracking ───────────────────────────────────────
  // Resets at midnight; tracks XP earned today + which subjects were studied
  const [dailyStats, setDailyStats] = useState(initDailyStats);

  // ── Subject selection ─────────────────────────────────────────────
  // Which Psychometric pillar is active: 'english' | 'math' | 'hebrew'
  const [currentSubject, setCurrentSubjectState] = useState(
    () => loadLS(LS_SUBJECT, null)
  );
  const setCurrentSubject = useCallback((subject) => {
    setCurrentSubjectState(subject);
    saveLS(LS_SUBJECT, subject);
  }, []);

  // ── Firebase Auth ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseReady) return;

    const init = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.warn('Firebase auth error (app will work offline):', e.message);
        setIsAuthReady(true);
      }
    };
    init();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // ── Supabase Auth ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseReady) return;

    // Restore existing session
    supabase.auth.getSession().then(({ data }) => {
      setSupabaseUser(data.session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Load Supabase Profile ─────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseReady || !supabaseUser) {
      setSupabaseProfile(null);
      return;
    }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single()
      .then(({ data }) => { if (data) setSupabaseProfile(data); });
  }, [supabaseUser]);

  // ── Sync wordStatuses from Supabase on login ──────────────────────
  // vocabSyncing = true while the fetch is in flight so FlashcardsPage
  // can wait for fresh data before building its card session.
  useEffect(() => {
    if (!isSupabaseReady || !supabaseUser) {
      setVocabSyncing(false);
      return;
    }

    setVocabSyncing(true);

    supabase
      .from('user_vocabulary')
      .select('word, status, next_review_date, interval_days, repetitions, ease_factor')
      .eq('user_id', supabaseUser.id)
      .then(({ data }) => {
        if (data) {
          const statuses = {};
          const srs      = {};
          for (const row of data) {
            const key    = row.word.toLowerCase();
            statuses[key] = row.status;
            srs[key]      = {
              nextReviewDate: row.next_review_date ?? 0,
              intervalDays:   row.interval_days   ?? 1,
              repetitions:    row.repetitions      ?? 0,
              easeFactor:     row.ease_factor      ?? 2.5,
            };
          }
          setWordStatusesState(prev => {
            const merged = { ...prev, ...statuses };
            saveLS(LS_STATUSES, merged);
            return merged;
          });
          setWordSRSData(prev => {
            const merged = { ...prev, ...srs };
            saveLS(LS_SRS, merged);
            return merged;
          });
        }
      })
      .catch(() => {}) // table may not exist yet — fail silently
      .finally(() => setVocabSyncing(false));
  }, [supabaseUser]);

  // ── Firebase Session Recovery ────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseReady || !user) return;
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'currentStatus');
    getDoc(ref).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.selectedShow)    setSelectedShow(d.selectedShow);
        if (d.selectedEpisode) setSelectedEpisode(d.selectedEpisode);
      }
    }).catch(() => {});
  }, [user]);

  // ── Live Word List (Firebase) ─────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseReady || !user) return;
    const wordsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'words');
    const unsub = onSnapshot(wordsRef, (snap) => {
      const words = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCapturedWords(words.sort((a, b) => b.timestamp - a.timestamp));
    });
    return () => unsub();
  }, [user]);

  // ── Supabase Auth helpers (username-based) ─────────────────────────
  // Supabase requires email format — we construct a private fake email
  // so users only ever see/enter a username.
  const supabaseSignIn = async (username, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: toFakeEmail(username),
      password,
    });
    return { error };
  };

  const supabaseSignUp = async (username, password) => {
    const { error } = await supabase.auth.signUp({
      email:    toFakeEmail(username),
      password,
      options:  { data: { full_name: username.trim() } },
    });
    return { error };
  };

  const supabaseSignOut = async () => {
    await supabase.auth.signOut();
  };

  // ── Word Status: set V / X / ? ────────────────────────────────────
  // Computes SRS schedule and syncs to Supabase (fire-and-forget).
  // The Supabase write is intentionally outside the React state setter
  // so it does not run in StrictMode's double-invoke of state updaters.
  const setWordStatus = useCallback((wordKey, status) => {
    const key = wordKey.toLowerCase();

    // 1. Update status string in state + localStorage
    setWordStatusesState(prev => {
      const next = { ...prev };
      if (status === null) {
        delete next[key];
      } else {
        next[key] = status;
      }
      saveLS(LS_STATUSES, next);
      return next;
    });

    // 2. Compute SRS + update state + sync to Supabase
    setWordSRSData(prev => {
      const next = { ...prev };

      if (status === null) {
        delete next[key];
        saveLS(LS_SRS, next);
        return next;
      }

      let srsUpdate;
      try {
        const quality = QUALITY[status] ?? 0;
        srsUpdate     = computeNextSRS(prev[key], quality);
      } catch (e) {
        console.warn('[SRS] computeNextSRS failed:', e.message);
        return next; // leave SRS unchanged on error
      }

      next[key] = srsUpdate;
      saveLS(LS_SRS, next);
      return next;
    });

    // 3. Supabase sync — runs AFTER state update, outside the setter
    //    so it's not affected by React StrictMode's double-invocation.
    if (status !== null && isSupabaseReady && supabaseUser) {
      const quality = QUALITY[status] ?? 0;
      // Re-read current SRS from localStorage to avoid closure staleness
      const currentSRS = loadLS(LS_SRS, {})[key];
      let srsUpdate;
      try {
        srsUpdate = computeNextSRS(currentSRS, quality);
      } catch {
        return; // skip sync if SRS fails
      }

      supabase.from('user_vocabulary').upsert({
        user_id:          supabaseUser.id,
        word:             key,
        status,
        next_review_date: srsUpdate.nextReviewDate,
        interval_days:    srsUpdate.intervalDays,
        repetitions:      srsUpdate.repetitions,
        ease_factor:      srsUpdate.easeFactor,
        updated_at:       new Date().toISOString(),
      }, { onConflict: 'user_id,word' }).catch(() => {}); // table may not exist yet
    }
  }, [supabaseUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Award XP ──────────────────────────────────────────────────────
  // Called by BattlePage, FlashcardsPage, ExamPage after correct answers.
  // Detects level-up by comparing old vs new level and fires levelUpEvent.
  // Also updates local daily stats (XP + subject activity).
  const awardXP = async (points) => {
    if (!isSupabaseReady || !supabaseUser || points <= 0) return;

    // Update daily stats locally (fire-and-forget — no await needed)
    setDailyStats(prev => {
      const today = todayISO();
      const base  = prev.date === today ? prev : { date: today, xp: 0, subjects: [] };
      const subSet = new Set(base.subjects);
      if (currentSubject) subSet.add(currentSubject);
      const next = { date: today, xp: base.xp + points, subjects: [...subSet] };
      saveLS(LS_DAILY, next);
      return next;
    });

    const oldXP    = supabaseProfile?.xp_points ?? 0;
    const oldLevel = getLevelInfo(oldXP).level;

    await supabase.rpc('increment_xp', {
      user_uuid: supabaseUser.id,
      points,
    }).catch(() => {});

    // Refresh local profile then check for level-up
    supabase.from('profiles').select('xp_points').eq('id', supabaseUser.id).single()
      .then(({ data }) => {
        if (!data) return;
        setSupabaseProfile(p => ({ ...p, xp_points: data.xp_points }));
        const newLevel = getLevelInfo(data.xp_points).level;
        if (newLevel > oldLevel) {
          setLevelUpEvent({ level: newLevel });
        }
      });
  };

  const clearLevelUpEvent = useCallback(() => setLevelUpEvent(null), []);

  // ── Add Word (Firebase) ───────────────────────────────────────────
  const addWord = async (text, episodeSeconds, options = {}) => {
    if (!text.trim()) return;
    const word = text.trim();

    const wordLower    = word.toLowerCase();
    const isDuplicate  = capturedWords.some(
      w => w.word.toLowerCase() === wordLower &&
           w.show === selectedShow &&
           w.episode === selectedEpisode
    );
    if (isDuplicate) return;

    const result  = analyzeWord(word);
    const newWord = {
      word,
      episodeTime: episodeSeconds,
      timestamp:   Date.now(),
      show:        selectedShow,
      episode:     selectedEpisode,
      invalid:     options.invalid ?? false,
      ...result,
    };

    let savedId = null;
    if (isFirebaseReady && user) {
      const wordsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'words');
      const ref = await addDoc(wordsRef, newWord);
      savedId = ref.id;
    } else {
      savedId = `local-${localIdCounter++}`;
      setCapturedWords(prev => [{ id: savedId, ...newWord }, ...prev]);
    }

    if (result.loading && navigator.onLine) {
      try {
        const onlineResult = await fetchOnlineTranslation(word);
        if (isFirebaseReady && user) {
          const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'words', savedId);
          await updateDoc(ref, onlineResult).catch(() => {});
        } else {
          setCapturedWords(prev =>
            prev.map(w => w.id === savedId ? { ...w, ...onlineResult } : w)
          );
        }
      } catch {
        const fallback = { translation: 'לא נמצא', loading: false, invalid: true };
        if (isFirebaseReady && user) {
          const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'words', savedId);
          updateDoc(ref, fallback).catch(() => {});
        } else {
          setCapturedWords(prev =>
            prev.map(w => w.id === savedId ? { ...w, ...fallback } : w)
          );
        }
      }
    }
  };

  // ── Re-analyze Word ───────────────────────────────────────────────
  const reanalyzeWord = async (wordDoc) => {
    const result = analyzeWord(wordDoc.word);
    if (isFirebaseReady && user) {
      const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'words', wordDoc.id);
      await updateDoc(ref, result).catch(() => {});
    } else {
      setCapturedWords(prev =>
        prev.map(w => w.id === wordDoc.id ? { ...w, ...result } : w)
      );
    }
  };

  // ── Delete Word ───────────────────────────────────────────────────
  const deleteWord = async (wordId) => {
    if (isFirebaseReady && user) {
      const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'words', wordId);
      await deleteDoc(ref).catch(() => {});
    } else {
      setCapturedWords(prev => prev.filter(w => w.id !== wordId));
    }
  };

  // ── Manual Word Injection ─────────────────────────────────────────
  const manualAddWord = async (rawWord, status) => {
    const word = rawWord.trim();
    if (!word) return null;
    const key = word.toLowerCase();

    if (_academicMap[key]) {
      const e = _academicMap[key];
      setWordStatus(word, status);
      return { word: e.word, translation: e.translation, found: 'local' };
    }

    const result = analyzeWord(word);
    if (!result.loading) {
      setWordStatus(word, status);
      return { word, translation: result.translation, found: 'local' };
    }

    if (navigator.onLine) {
      try {
        const online = await fetchOnlineTranslation(word);
        setWordStatus(word, status);
        return { word, translation: online.translation, found: 'online' };
      } catch {}
    }

    setWordStatus(word, status);
    return { word, translation: null, found: 'none' };
  };

  // ── Session State ─────────────────────────────────────────────────
  const saveSessionStatus = (show, episode) => {
    if (!isFirebaseReady || !user) return;
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'currentStatus');
    setDoc(ref, { selectedShow: show, selectedEpisode: episode }, { merge: true }).catch(() => {});
  };

  const startEpisode = (show, episode) => {
    setSelectedShow(show);
    setSelectedEpisode(episode);
    saveSessionStatus(show, episode);
  };

  // ── Derived ───────────────────────────────────────────────────────
  const savedEpisodes = (() => {
    const map = {};
    capturedWords.forEach(w => {
      if (w.show && w.episode) {
        const key = `${w.show}||${w.episode}`;
        if (!map[key]) map[key] = { show: w.show, episode: w.episode, count: 0 };
        map[key].count++;
      }
    });
    return Object.values(map);
  })();

  const currentEpisodeWords = capturedWords.filter(
    w => w.show === selectedShow && w.episode === selectedEpisode
  );

  const unknownWords = Object.entries(wordStatuses)
    .filter(([, s]) => s === WORD_STATUS.UNKNOWN)
    .map(([w]) => w);

  const uncertainWords = Object.entries(wordStatuses)
    .filter(([, s]) => s === WORD_STATUS.UNCERTAIN)
    .map(([w]) => w);

  // Due for SRS review today (status unknown or uncertain with past nextReviewDate)
  const dueWords = Object.entries(wordSRSData)
    .filter(([w, srs]) => {
      const status = wordStatuses[w];
      return (
        (status === WORD_STATUS.UNKNOWN || status === WORD_STATUS.UNCERTAIN) &&
        isDueForReview(srs)
      );
    })
    .map(([w]) => w);

  const value = {
    // Daily activity
    dailyStats,
    isDailyGoalMet: dailyStats.xp >= DAILY_XP_GOAL,
    isCombo:        dailyStats.subjects.length > 1,
    DAILY_XP_GOAL,
    // Firebase
    user,
    isAuthReady,
    isFirebaseReady,
    capturedWords,
    currentEpisodeWords,
    savedEpisodes,
    selectedShow,
    selectedEpisode,
    examWords,
    setExamWords,
    examResults,
    setExamResults,
    addWord,
    reanalyzeWord,
    deleteWord,
    startEpisode,
    setSelectedShow,
    setSelectedEpisode,
    // Subject
    currentSubject,
    setCurrentSubject,
    // Word statuses
    wordStatuses,
    setWordStatus,
    manualAddWord,
    unknownWords,
    uncertainWords,
    // SRS
    wordSRSData,
    dueWords,
    // Supabase
    supabaseUser,
    supabaseProfile,
    supabaseSignIn,
    supabaseSignUp,
    supabaseSignOut,
    isSupabaseReady,
    awardXP,
    vocabSyncing,
    levelUpEvent,
    clearLevelUpEvent,
  };

  return (
    <VocabContext.Provider value={value}>
      {children}
    </VocabContext.Provider>
  );
};

export const useVocab = () => {
  const ctx = useContext(VocabContext);
  if (!ctx) throw new Error('useVocab must be used inside VocabContextProvider');
  return ctx;
};

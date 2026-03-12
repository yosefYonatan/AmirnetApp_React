import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInAnonymously, onAuthStateChanged, signInWithCustomToken
} from 'firebase/auth';
import {
  collection, doc, setDoc, onSnapshot, addDoc, updateDoc, deleteDoc, getDoc
} from 'firebase/firestore';
import { auth, db, appId, isFirebaseReady } from '../utils/firebase';
import { analyzeWord, fetchOnlineTranslation } from '../utils/wordAnalyzer';

// ==========================================
// VOCAB CONTEXT — the global brain of the app
//
// When isFirebaseReady is false (local dev without Firebase config),
// the app runs in local-only mode: words are stored in React state
// only (not persisted across refreshes). All core features still work.
// ==========================================

const VocabContext = createContext(null);

// Local-only word store — used when Firebase is not configured
let localIdCounter = 1;

export const VocabContextProvider = ({ children }) => {
  const [user, setUser]                     = useState(null);
  const [isAuthReady, setIsAuthReady]       = useState(!isFirebaseReady); // offline = immediately ready
  const [capturedWords, setCapturedWords]   = useState([]);
  const [selectedShow, setSelectedShow]     = useState(null);
  const [selectedEpisode, setSelectedEpisode] = useState('');
  const [examWords, setExamWords]           = useState([]);
  const [examResults, setExamResults]       = useState(null); // { score, total, results[] }

  // ── Auth (only when Firebase is configured) ───────────────────────
  useEffect(() => {
    if (!isFirebaseReady) return;

    const init = async () => {
      try {
        if (__initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.warn('Auth error (app will work offline):', e.message);
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

  // ── Session Recovery ──────────────────────────────────────────────
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

  // ── Live Word List ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseReady || !user) return;
    const wordsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'words');
    const unsub = onSnapshot(wordsRef, (snap) => {
      const words = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCapturedWords(words.sort((a, b) => b.timestamp - a.timestamp));
    });
    return () => unsub();
  }, [user]);

  // ── Add Word ──────────────────────────────────────────────────────
  // Flow:
  //   1. analyzeWord()  — instant, sync, checks local DB
  //   2. Save immediately so the word appears on screen right away
  //   3. If not found locally AND device is online → fetchOnlineTranslation()
  //      in the background and update the saved entry when it returns
  const addWord = async (text, episodeSeconds, options = {}) => {
    if (!text.trim()) return;
    const word = text.trim();

    // ── Duplicate detection ────────────────────────────────────────────
    const wordLower = word.toLowerCase();
    const isDuplicate = capturedWords.some(
      w => w.word.toLowerCase() === wordLower &&
           w.show === selectedShow &&
           w.episode === selectedEpisode
    );
    if (isDuplicate) return;

    const result = analyzeWord(word);
    const newWord = {
      word,
      episodeTime: episodeSeconds,
      timestamp:   Date.now(),
      show:        selectedShow,
      episode:     selectedEpisode,
      invalid:     options.invalid ?? false,
      ...result,
    };

    // ── Save immediately (shows spinner if loading: true) ─────────────
    let savedId = null;

    if (isFirebaseReady && user) {
      const wordsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'words');
      const ref = await addDoc(wordsRef, newWord);
      savedId = ref.id;
    } else {
      savedId = `local-${localIdCounter++}`;
      setCapturedWords(prev => [{ id: savedId, ...newWord }, ...prev]);
    }

    // ── Online fallback (only when local DB has no match) ─────────────
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
        // Network error — clear spinner, mark invalid (no translation found anywhere)
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

  // ── Persist Session State ─────────────────────────────────────────
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

  const value = {
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

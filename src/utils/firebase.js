import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// __firebase_config is injected by the hosting platform at runtime.
// In local dev, vite.config.js defines it as '{}' so the app loads cleanly.
// ⚠️  To connect to a real Firebase project locally, replace '{}' in
//     vite.config.js with your project config JSON string.
const firebaseConfig = JSON.parse(__firebase_config);

const hasValidConfig = !!(firebaseConfig.projectId && firebaseConfig.apiKey);

// Guard against double-initialization (React StrictMode runs effects twice).
const app = getApps().length === 0
  ? initializeApp(hasValidConfig ? firebaseConfig : { projectId: 'offline-dev', apiKey: 'offline' })
  : getApps()[0];

export { app };
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const appId = __app_id || 'amirnet-dev';

// Flag consumed by VocabContext — if false, Firestore calls are skipped
// and the app runs in local-only mode (words stored in React state only).
export const isFirebaseReady = hasValidConfig;

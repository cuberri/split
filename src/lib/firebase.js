import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

// These values are not secrets: Firebase web config is public by design.
// Access is controlled by firestore.rules.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasConfig = Boolean(config.apiKey && config.projectId);

// Local mode (data stays in this browser) when there is no Firebase config,
// or when forced with VITE_STORAGE=local.
export const LOCAL_MODE = import.meta.env.VITE_STORAGE === 'local' || !hasConfig;

// Persistent local cache: the group loads instantly on revisit, and expenses
// added offline (e.g. abroad without data) sync when the connection returns.
export const db = LOCAL_MODE
  ? null
  : initializeFirestore(initializeApp(config), {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });

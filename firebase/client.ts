import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

import { readFirebaseConfig } from "./config";

// Each value has to be written as a literal `process.env.NEXT_PUBLIC_*` member
// access: that exact expression is what the bundler substitutes at compile
// time. Passing `process.env` itself, or reading it through a variable, inlines
// nothing and leaves every value undefined in the browser.
const firebaseConfig = readFirebaseConfig({
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Task/course objects carry optional fields (courseId, dueAt, completedAt, …)
// that flow through as `undefined` rather than omitted keys, matching how
// convex/tasks.ts's create()/restore() already worked. Firestore's default
// write functions throw on an `undefined` field value; this makes them skip
// the key instead. Does NOT help *remove* an existing field — that needs
// deleteField() explicitly (see firebase/tasks.ts's uncomplete()).
// Slice 9 (M17): IndexedDB-backed offline persistence, browser-only —
// persistentLocalCache needs IndexedDB, which doesn't exist in the Node
// process that server-renders this same "use client" module tree during
// SSR (localCache: undefined there reproduces today's in-memory-only
// behavior exactly). This is what turns "board reads whatever onSnapshot
// last delivered" into a real cache that survives a reload: schedule,
// courses, prefs, and done-today keep rendering offline, and a write made
// offline (drag, complete, capture's own create()) queues in Firestore's
// own local queue and syncs automatically on reconnect.
// persistentMultipleTabManager so a second board tab doesn't get kicked to
// memory-only persistence.
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  localCache:
    typeof window === "undefined"
      ? undefined
      : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

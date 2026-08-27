import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Task/course objects carry optional fields (courseId, dueAt, completedAt, …)
// that flow through as `undefined` rather than omitted keys, matching how
// convex/tasks.ts's create()/restore() already worked. Firestore's default
// write functions throw on an `undefined` field value; this makes them skip
// the key instead. Does NOT help *remove* an existing field — that needs
// deleteField() explicitly (see firebase/tasks.ts's uncomplete()).
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

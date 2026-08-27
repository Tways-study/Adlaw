"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "./client";

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(auth, email, password);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

function isSecure(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:";
}

// Shared by firebase/hooks.ts's AuthProvider (fires on every token change,
// including the hourly SDK auto-refresh) and the login page's "already
// signed in" mount check, so both write the cookie through one path instead
// of racing two independent writers.
export async function syncSessionCookie(user: User | null): Promise<void> {
  if (!user) {
    document.cookie = "session=; path=/; samesite=lax; max-age=0";
    return;
  }
  const token = await user.getIdToken();
  document.cookie = `session=${token}; path=/; samesite=lax; max-age=3600${isSecure() ? "; secure" : ""}`;
}

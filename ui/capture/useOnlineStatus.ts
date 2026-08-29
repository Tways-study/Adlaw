"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

// The server has no network concept — assume online so SSR/first paint
// never shows a false "offline" flash before hydration reads the real value.
function getServerSnapshot(): boolean {
  return true;
}

// navigator.onLine reflects "has a network interface," not "can reach
// Firestore" — good enough for a UI marker (docs/02-app-flow.md's cross-
// cutting table calls for a small marker, not a reachability probe), and
// ui/capture/offlineQueue.ts's flushCaptureQueue still falls back to
// leaving items queued if a "reconnect" turns out stale.
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

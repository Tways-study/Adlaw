// Client-side Calendar operations that need no server boundary. `connect`
// and `sync` need OAuth secrets and the encrypted-token handling that lives
// in app/api/calendar/* (see docs/03-backend-schema.md §Calendar OAuth) —
// but disconnect is, per that doc, "a plain Firestore write, no server
// boundary needed": it runs under the browser's own Firebase Auth session
// via the client SDK, same as the rest of firebase/.

import { collection, deleteField, doc, getDocs, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "./client";

/**
 * Disconnects Google Calendar: clears the four google* fields from
 * settings/prefs and deletes every cached event. The schedule and board are
 * unaffected (docs/02-app-flow.md S7's exit note) — calendarCache is a pure
 * cache and core/time.ts already degrades to the manual schedule alone when
 * it's empty, exactly the state this leaves things in.
 */
export async function disconnect(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid, "settings", "prefs"), {
    googleRefreshTokenEncrypted: deleteField(),
    googleConnectedAt: deleteField(),
    googleLastSyncedAt: deleteField(),
    googleSyncStatus: deleteField(),
  });

  // Mirrors the writeBatch-of-deletes shape firebase/tasks.ts's move()/
  // create() already use for atomic multi-doc writes — getDocs then a
  // single batch, rather than one deleteDoc per event.
  const cacheCol = collection(db, "users", uid, "calendarCache");
  const snap = await getDocs(cacheCol);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

/**
 * Triggers a sync via the server Route Handler (app/api/calendar/sync) —
 * same-origin fetch, so the `session` cookie rides along automatically with
 * no extra wiring. Thin wrapper only: this is a user-triggered action
 * ("Sync now" in S7, or a focus-triggered revalidation per
 * docs/04-tdd.md's data flow), not something that needs a silent fallback
 * the way capture does — a network failure throws, and the caller (a "Sync
 * now" button) catches it and shows a message.
 */
export async function triggerSync(): Promise<{ status: string; count?: number }> {
  const res = await fetch("/api/calendar/sync", { method: "POST" });
  return (await res.json()) as { status: string; count?: number };
}

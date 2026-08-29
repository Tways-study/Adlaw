import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "./client";

// Full data export (PRD M18 / docs/03-backend-schema.md's data export
// surface). Runs entirely client-side: there's no Admin SDK, so nothing
// server-side can enumerate a user's subcollections either, and the client
// already holds every listener's data plus its own auth. One-shot getDocs
// throughout, not onSnapshot — export wants a point-in-time snapshot, not a
// subscription, and must not depend on useAllTasks's live listener already
// being mounted.
export async function exportAllData(uid: string): Promise<void> {
  const [tasksSnap, coursesSnap, scheduleBlocksSnap, aiLogSnap, settingsSnap] = await Promise.all([
    getDocs(collection(db, "users", uid, "tasks")),
    getDocs(collection(db, "users", uid, "courses")),
    getDocs(collection(db, "users", uid, "scheduleBlocks")),
    getDocs(collection(db, "users", uid, "aiLog")),
    getDoc(doc(db, "users", uid, "settings", "prefs")),
  ]);

  const toRows = (snap: { docs: { id: string; data(): Record<string, unknown> }[] }) =>
    snap.docs.map((d) => ({ _id: d.id, ...d.data() }));

  // googleRefreshTokenEncrypted is stripped explicitly even though nothing
  // writes it yet (Slice 6 is not built) — the spec names it by name as
  // something an export must never carry, so this stays correct the moment
  // that field starts being written without anyone having to remember to
  // come back here.
  const rawSettings = (settingsSnap.exists() ? settingsSnap.data() : {}) as Record<string, unknown>;
  const settings = { ...rawSettings };
  delete settings.googleRefreshTokenEncrypted;

  const payload = {
    exportedAt: Date.now(),
    tasks: toRows(tasksSnap),
    courses: toRows(coursesSnap),
    scheduleBlocks: toRows(scheduleBlocksSnap),
    aiLog: toRows(aiLogSnap),
    settings,
  };

  // This is the real app running in a real browser, not a sandboxed
  // environment — a plain <a download> works fine here.
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = `adlaw-export-${new Date(payload.exportedAt).toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

import { doc, setDoc } from "firebase/firestore";
import { db } from "./client";

// settings/prefs is a single fixed-id document per user, and may not exist
// yet the first time either of these is called — merge:true creates or
// patches it without disturbing fields other slices (dayEndMin, the
// Slice 6 google* fields) own. Mirrors firebase/schedule.ts's setDayEnd
// exactly.

export async function setTheme(uid: string, theme: "light" | "dark" | "auto"): Promise<void> {
  await setDoc(doc(db, "users", uid, "settings", "prefs"), { theme }, { merge: true });
}

export async function setAiPreference(
  uid: string,
  provider: "gemini" | "heuristic",
  model?: string,
): Promise<void> {
  await setDoc(
    doc(db, "users", uid, "settings", "prefs"),
    { aiProvider: provider, ...(model !== undefined ? { aiModel: model } : {}) },
    { merge: true },
  );
}

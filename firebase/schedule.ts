import { addDoc, collection, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./client";
import type { ScheduleBlock } from "@/core/types";

export async function createBlock(
  uid: string,
  args: Pick<ScheduleBlock, "weekday" | "startMin" | "endMin" | "label" | "kind">,
): Promise<string> {
  const ref = await addDoc(collection(db, "users", uid, "scheduleBlocks"), {
    ...args,
    activeFrom: Date.now(),
  });
  return ref.id;
}

export async function updateBlock(
  uid: string,
  id: string,
  patch: Partial<Pick<ScheduleBlock, "weekday" | "startMin" | "endMin" | "label" | "kind">>,
): Promise<void> {
  await updateDoc(doc(db, "users", uid, "scheduleBlocks", id), patch);
}

// Never deletes — docs/02-app-flow.md S4's stated behavior. A dropped class
// or ended job keeps its historical days intact (core/time.ts's
// isBlockActiveOn stops selecting it for any date on/after activeTo);
// deleting it outright would erase what was actually true on past days.
export async function endBlock(uid: string, id: string, endedAt: number = Date.now()): Promise<void> {
  await updateDoc(doc(db, "users", uid, "scheduleBlocks", id), { activeTo: endedAt });
}

// settings/prefs is a single fixed-id document per user, and may not exist
// yet the first time a day-end is set — merge:true creates or patches it
// without disturbing fields later slices (theme, aiProvider, …) will add.
export async function setDayEnd(uid: string, dayEndMin: number): Promise<void> {
  await setDoc(doc(db, "users", uid, "settings", "prefs"), { dayEndMin }, { merge: true });
}

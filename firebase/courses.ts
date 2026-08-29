import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { db } from "./client";

// Mirrors firebase/schedule.ts's style exactly: small typed functions, no
// service layer, no extra abstraction. Course rename edits `code` — the
// field every consumer (EverythingRail.tsx, CaptureBar.tsx, TaskCard.tsx)
// actually renders and matches against on parse; `name` is dead (see the
// plan's "Course rename edits code" decision).

export async function addCourse(uid: string, code: string): Promise<string> {
  const ref = await addDoc(collection(db, "users", uid, "courses"), {
    code,
    active: true,
  });
  return ref.id;
}

export async function renameCourse(uid: string, id: string, code: string): Promise<void> {
  await updateDoc(doc(db, "users", uid, "courses", id), { code });
}

// Soft delete only — never a hard delete. Tasks reference courseId, and a
// retired course must keep resolving for every task that already points at
// it (useCourses()'s active == true filter is what drops it from new
// capture/breakdown hints; it never deletes the document itself).
export async function retireCourse(uid: string, id: string): Promise<void> {
  await updateDoc(doc(db, "users", uid, "courses", id), { active: false });
}

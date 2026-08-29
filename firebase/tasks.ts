import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./client";
import { computeLaneOrder } from "@/core/order";
import type { ParseState, Task, MovableStatus } from "@/core/types";

// Firestore's web SDK only allows Transaction.get() on a DocumentReference,
// never a Query (verified against @firebase/firestore's own Transaction
// type — the Admin SDK's transactions differ, but this app never runs
// there). So "what's the last laneOrder in this lane" is a plain read, not
// part of any transaction's optimistic-concurrency check. A tiny staleness
// window follows: two near-simultaneous appends into the same lane could
// each compute against the same "last" value. That's the same tolerance
// core/order.ts's degrade-to-append rule already assumes for a stale
// beforeId/afterId — cosmetic ordering, not a correctness or ownership
// issue, and not something the equivalent Convex mutation's mutation-level
// transaction avoided perfectly either.
async function lastLaneOrder(
  tasksCol: ReturnType<typeof collection>,
  status: string,
): Promise<number | null> {
  const snap = await getDocs(
    query(tasksCol, where("status", "==", status), orderBy("laneOrder", "desc"), limit(1)),
  );
  return (snap.docs[0]?.data().laneOrder as number | undefined) ?? null;
}

// Finds the active course matching `code` (case-insensitive), or stages a
// new one in `batch` and returns its not-yet-committed id. Shared by
// create() and applyParse() so a capture and a retried parse resolve a
// courseCode to the same course the same way — a writeBatch gives the same
// "course and task land together or not at all" atomicity without
// requiring any Query-based read inside a Transaction (see
// lastLaneOrder's comment).
async function resolveCourseId(
  coursesCol: ReturnType<typeof collection>,
  batch: ReturnType<typeof writeBatch>,
  code: string | undefined,
): Promise<string | undefined> {
  const normalized = code?.trim();
  if (!normalized) return undefined;
  const existing = await getDocs(query(coursesCol, where("active", "==", true)));
  const match = existing.docs.find(
    (d) => (d.data().code as string).toLowerCase() === normalized.toLowerCase(),
  );
  if (match) return match.id;
  const newCourseRef = doc(coursesCol);
  batch.set(newCourseRef, { code: normalized, active: true });
  return newCourseRef.id;
}

export async function create(
  uid: string,
  args: {
    rawText: string;
    title: string;
    courseCode?: string;
    estimateMin: number;
    dueAt?: number;
    parseState: ParseState;
  },
): Promise<string> {
  const tasksCol = collection(db, "users", uid, "tasks");
  const coursesCol = collection(db, "users", uid, "courses");
  const estimateMin = args.estimateMin > 0 ? args.estimateMin : 30;

  const batch = writeBatch(db);
  const courseId = await resolveCourseId(coursesCol, batch, args.courseCode);
  const lastOrder = await lastLaneOrder(tasksCol, "shelf");

  const taskRef = doc(tasksCol);
  batch.set(taskRef, {
    title: args.title,
    rawText: args.rawText,
    courseId,
    estimateMin,
    dueAt: args.dueAt,
    status: "shelf",
    laneOrder: computeLaneOrder(null, null, lastOrder),
    parseState: args.parseState,
    createdAt: Date.now(),
  });
  await batch.commit();
  return taskRef.id;
}

// Applied by ui/board/TaskCard.tsx's quiet retry affordance (CLAUDE.md:
// capture never fails, but a `parseState: "fallback"` card offers a retry
// that re-runs requestParse and, on success, overwrites the fields it got
// wrong the first time — title, course, estimate, due date, parseState.
// Never touches status/laneOrder/parentId: a retry corrects a parse, it
// never moves or re-homes the task.
export async function applyParse(
  uid: string,
  id: string,
  args: {
    title: string;
    courseCode?: string;
    estimateMin: number;
    dueAt?: number;
    parseState: ParseState;
  },
): Promise<void> {
  const tasksCol = collection(db, "users", uid, "tasks");
  const coursesCol = collection(db, "users", uid, "courses");
  const estimateMin = args.estimateMin > 0 ? args.estimateMin : 30;

  const batch = writeBatch(db);
  const courseId = await resolveCourseId(coursesCol, batch, args.courseCode);

  // deleteField(), not `undefined` — ignoreUndefinedProperties only skips
  // writing a never-set field, it does not clear one that already exists
  // (see uncomplete()'s identical comment on completedAt below).
  batch.update(doc(tasksCol, id), {
    title: args.title,
    estimateMin,
    courseId: courseId ?? deleteField(),
    dueAt: args.dueAt ?? deleteField(),
    parseState: args.parseState,
  });
  await batch.commit();
}

// "Not this one" (PRD M8) — excludes a task from focus picks for the rest
// of today without moving or otherwise touching it. requestFocus's own
// candidate list (built from the live shelf/next tasks) is what actually
// honours this field; writing it here is the only side effect.
export async function excludeFromFocusToday(uid: string, id: string, until: number): Promise<void> {
  await updateDoc(doc(db, "users", uid, "tasks", id), { excludedFromFocusUntil: until });
}

// Persists an accepted breakdown (PRD M7) as ordered, schedulable child
// tasks — never called automatically by ai/'s breakdown() or
// firebase/ai.ts's requestBreakdown, which only ever propose steps; writing
// them is a separate, explicit action the caller takes once the user
// accepts the preview. Steps land in "shelf" like any freshly captured
// task; `parentId` marks the parent unschedulable per
// docs/03-backend-schema.md's invariant #2 (enforced by callers reading
// `parentId` to exclude a task from lanes — see firebase/hooks.tsx's
// useTasksSnapshot, which already filters `parentId === undefined`).
export async function createSteps(
  uid: string,
  parentId: string,
  steps: Array<{ title: string; estimateMin: number; dueAt?: number }>,
): Promise<string[]> {
  const tasksCol = collection(db, "users", uid, "tasks");
  let order = await lastLaneOrder(tasksCol, "shelf");

  const batch = writeBatch(db);
  const ids: string[] = [];
  steps.forEach((step, i) => {
    const ref = doc(tasksCol);
    order = computeLaneOrder(null, null, order);
    batch.set(ref, {
      title: step.title,
      rawText: step.title,
      estimateMin: step.estimateMin,
      dueAt: step.dueAt,
      status: "shelf",
      laneOrder: order,
      parentId,
      stepIndex: i,
      parseState: "ok",
      createdAt: Date.now(),
    });
    ids.push(ref.id);
  });
  await batch.commit();
  return ids;
}

export async function complete(uid: string, id: string): Promise<void> {
  const ref = doc(db, "users", uid, "tasks", id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists() || snap.data().status === "done") return;
    tx.update(ref, { status: "done", completedAt: Date.now() });
  });
}

export async function uncomplete(uid: string, id: string): Promise<void> {
  const tasksCol = collection(db, "users", uid, "tasks");
  const ref = doc(tasksCol, id);
  const lastOrder = await lastLaneOrder(tasksCol, "next");
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists() || snap.data().status !== "done") return;
    // deleteField(), not `undefined` — ignoreUndefinedProperties only skips
    // writing a never-set field, it does not clear one that already exists.
    tx.update(ref, {
      status: "next",
      laneOrder: computeLaneOrder(null, null, lastOrder),
      completedAt: deleteField(),
    });
  });
}

export async function remove(uid: string, id: string): Promise<void> {
  // No ownership check needed — users/{uid}/tasks/{id} is the ownership
  // boundary, enforced structurally by firestore.rules regardless of what
  // the client sends. Ownership got *stronger* under Firestore, not weaker.
  await deleteDoc(doc(db, "users", uid, "tasks", id));
}

export async function restore(uid: string, task: Omit<Task, "_id">): Promise<string> {
  const ref = await addDoc(collection(db, "users", uid, "tasks"), task);
  return ref.id;
}

export async function move(
  uid: string,
  id: string,
  status: MovableStatus,
  beforeId?: string,
  afterId?: string,
): Promise<void> {
  const tasksCol = collection(db, "users", uid, "tasks");

  // Pre-transaction queries pick *candidate* document ids (the current
  // "now" incumbent, the current last laneOrder in each relevant lane).
  // Every candidate is then re-read by reference inside the transaction
  // below (tx.get(ref) — a DocumentReference, not a Query, so it's allowed
  // and DOES get Firestore's normal optimistic-concurrency retry). Only the
  // choice of *which* documents to look at is made outside that guarantee;
  // the actual read-modify-write on each one is still atomic and consistent.
  let incumbentId: string | null = null;
  if (status === "now") {
    const incumbentSnap = await getDocs(
      query(tasksCol, where("status", "==", "now"), orderBy("laneOrder", "asc"), limit(1)),
    );
    incumbentId = incumbentSnap.docs[0]?.id ?? null;
  }
  const mayNeedAppend = !(beforeId && afterId);
  const moverLastOrderGuess = mayNeedAppend ? await lastLaneOrder(tasksCol, status) : null;
  const nextLastOrderGuess = status === "now" ? await lastLaneOrder(tasksCol, "next") : null;

  await runTransaction(db, async (tx) => {
    const taskRef = doc(tasksCol, id);
    const taskSnap = await tx.get(taskRef);
    if (!taskSnap.exists() || taskSnap.data().status === "done") return;

    const beforeRef = beforeId ? doc(tasksCol, beforeId) : null;
    const afterRef = afterId ? doc(tasksCol, afterId) : null;
    // incumbentId === id means the mover is already "now" — a no-op, not a
    // self-demotion, so treat it as no incumbent at all.
    const incumbentRef = incumbentId && incumbentId !== id ? doc(tasksCol, incumbentId) : null;

    const [beforeSnap, afterSnap, incumbentSnap] = await Promise.all([
      beforeRef ? tx.get(beforeRef) : null,
      afterRef ? tx.get(afterRef) : null,
      incumbentRef ? tx.get(incumbentRef) : null,
    ]);

    const beforeLO =
      beforeSnap?.exists() && beforeSnap.data().status === status
        ? (beforeSnap.data().laneOrder as number)
        : null;
    const afterLO =
      afterSnap?.exists() && afterSnap.data().status === status
        ? (afterSnap.data().laneOrder as number)
        : null;
    const moverLastOrder = !(beforeLO !== null && afterLO !== null) ? moverLastOrderGuess : null;

    // If the pre-transaction incumbent already left "now" by the time this
    // commits, skip demoting it — same tolerant degrade as a stale
    // beforeId/afterId, rather than acting on data that's no longer true.
    const incumbentStillNow = incumbentSnap?.exists() && incumbentSnap.data().status === "now";

    if (incumbentRef && incumbentStillNow) {
      tx.update(incumbentRef, {
        status: "next",
        laneOrder: computeLaneOrder(null, null, nextLastOrderGuess),
      });
    }
    tx.update(taskRef, { status, laneOrder: computeLaneOrder(beforeLO, afterLO, moverLastOrder) });
  });
}

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
  const normalized = args.courseCode?.trim();

  // No transaction needed here — a writeBatch gives the same "course and
  // task land together or not at all" atomicity without requiring any
  // Query-based read inside a Transaction (see lastLaneOrder's comment).
  let courseId: string | undefined;
  if (normalized) {
    const existing = await getDocs(query(coursesCol, where("active", "==", true)));
    const match = existing.docs.find(
      (d) => (d.data().code as string).toLowerCase() === normalized.toLowerCase(),
    );
    courseId = match?.id;
  }
  const lastOrder = await lastLaneOrder(tasksCol, "shelf");

  const batch = writeBatch(db);
  const newCourseRef = normalized && !courseId ? doc(coursesCol) : null;
  if (newCourseRef) batch.set(newCourseRef, { code: normalized, active: true });

  const taskRef = doc(tasksCol);
  batch.set(taskRef, {
    title: args.title,
    rawText: args.rawText,
    courseId: courseId ?? newCourseRef?.id,
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

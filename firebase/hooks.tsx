"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  type Query,
} from "firebase/firestore";
import { auth, db } from "./client";
import { syncSessionCookie } from "./auth";
import type { CalendarCacheEntry, Course, Prefs, ScheduleBlock, Task, TaskStatus } from "@/core/types";
import type { AiLogEntry } from "@/ai/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}
const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onIdTokenChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      await syncSessionCookie(u);
    });
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

// A raw, unfiltered listener over every task for this uid — mirrors
// useScheduleBlocks's "fetch whole, unfiltered" pattern below (a bare
// collection listener needs no composite index, and a student's total task
// count is small). Used to work out which top-level tasks have been broken
// down into steps (useStepParentIds, right below) and, in
// ui/board/TaskCard.tsx, to look up a step's parent title/due date and its
// sibling count for the "step 2 of 4" position indicator (PRD M7).
export function useAllTasks(): Task[] | undefined {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [resolved, setResolved] = useState<{ uid: string; tasks: Task[] } | undefined>(undefined);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(collection(db, "users", uid, "tasks"), (snap) => {
      setResolved({ uid, tasks: snap.docs.map((d) => ({ _id: d.id, ...(d.data() as Omit<Task, "_id">) })) });
    });
  }, [uid]);
  return resolved?.uid === uid ? resolved.tasks : undefined;
}

// Parent ids that currently have at least one step. M7: "Steps are
// schedulable; the parent is not" — a parent with steps must drop out of
// every lane and out of the capacity queue once broken down, or its
// minutes get counted twice (once as the parent, once as its steps).
function useStepParentIds(): Set<string> | undefined {
  const allTasks = useAllTasks();
  return useMemo(() => {
    if (allTasks === undefined) return undefined;
    const ids = new Set<string>();
    for (const t of allTasks) {
      if (t.parentId !== undefined) ids.add(t.parentId);
    }
    return ids;
  }, [allTasks]);
}

function useTasksSnapshot(
  uid: string | null,
  buildQuery: (col: ReturnType<typeof collection>) => Query,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[],
): Task[] | undefined {
  // Keyed by the uid the data was actually fetched for, not just "is there a
  // uid" — resetting to undefined only through a render-time mismatch check
  // (rather than an explicit setState(undefined) at the top of the effect)
  // means a sign-out or account switch can never leak the previous
  // account's tasks for a frame while the new subscription is still
  // resolving, and avoids calling setState synchronously in the effect body.
  const [resolved, setResolved] = useState<{ uid: string; tasks: Task[] } | undefined>(undefined);
  useEffect(() => {
    if (!uid) return;
    const q = buildQuery(collection(db, "users", uid, "tasks"));
    return onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ _id: d.id, ...(d.data() as Omit<Task, "_id">) }));
      setResolved({ uid, tasks: rows });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, ...deps]);

  const rows = resolved?.uid === uid ? resolved.tasks : undefined;
  const stepParentIds = useStepParentIds();

  // A step (parentId set) always passes through whatever status query
  // fetched it. A top-level task (no parentId) drops out the moment it has
  // at least one step, in every status lane at once (shelf/next/now/done),
  // so a broken-down parent's minutes are counted exactly once — as its
  // steps — never twice, in every capacity/cutline/timeline consumer that
  // reads useTasksByStatus/useDoneToday (ui/board/useDayPlan.ts's queue in
  // particular). A childless top-level task is unaffected.
  return useMemo(() => {
    if (rows === undefined || stepParentIds === undefined) return undefined;
    return rows.filter((t) => t.parentId !== undefined || !stepParentIds.has(t._id));
  }, [rows, stepParentIds]);
}

export function useTasksByStatus(status: TaskStatus): Task[] | undefined {
  const { user } = useAuth();
  return useTasksSnapshot(
    user?.uid ?? null,
    (col) => query(col, where("status", "==", status), orderBy("laneOrder", "asc")),
    [status],
  );
}

export function useDoneToday(startOfDayMs: number): Task[] | undefined {
  const { user } = useAuth();
  return useTasksSnapshot(
    user?.uid ?? null,
    (col) =>
      query(
        col,
        where("status", "==", "done"),
        where("completedAt", ">=", startOfDayMs),
        orderBy("completedAt", "desc"),
      ),
    [startOfDayMs],
  );
}

export function useCourses(): Course[] | undefined {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [resolved, setResolved] = useState<{ uid: string; courses: Course[] } | undefined>(undefined);
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "courses"), where("active", "==", true));
    return onSnapshot(q, (snap) => {
      setResolved({ uid, courses: snap.docs.map((d) => ({ _id: d.id, ...(d.data() as Omit<Course, "_id">) })) });
    });
  }, [uid]);
  return resolved?.uid === uid ? resolved.courses : undefined;
}

export function useScheduleBlocks(): ScheduleBlock[] | undefined {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [resolved, setResolved] = useState<{ uid: string; blocks: ScheduleBlock[] } | undefined>(undefined);
  useEffect(() => {
    if (!uid) return;
    // Fetched whole, unfiltered — core/time.ts does the weekday / activeFrom
    // / activeTo selection. A bare collection listener needs no composite
    // index; a semester's schedule is tens of documents. Don't add a
    // where()/orderBy() here — that's the missing-index bug CLAUDE.md says
    // not to repeat.
    return onSnapshot(collection(db, "users", uid, "scheduleBlocks"), (snap) => {
      setResolved({
        uid,
        blocks: snap.docs.map((d) => ({ _id: d.id, ...(d.data() as Omit<ScheduleBlock, "_id">) })),
      });
    });
  }, [uid]);
  return resolved?.uid === uid ? resolved.blocks : undefined;
}

// Recent aiLog entries, newest first — the Settings review list (PRD M18):
// "recent parses, whether each needed correction." A single orderBy with no
// where() clause needs no composite index — Firestore provides the
// single-field index automatically — so this is the same "fetch modestly,
// no manual index" shape as useScheduleBlocks/useCourses, just sorted
// instead of unfiltered.
export function useAiLog(): AiLogEntry[] | undefined {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [resolved, setResolved] = useState<{ uid: string; entries: AiLogEntry[] } | undefined>(undefined);
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "aiLog"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setResolved({
        uid,
        entries: snap.docs.map((d) => ({ _id: d.id, ...(d.data() as Omit<AiLogEntry, "_id">) })),
      });
    });
  }, [uid]);
  return resolved?.uid === uid ? resolved.entries : undefined;
}

// The calendarCache listener (Slice 6). Bare collection listener, no
// orderBy — same "fetch modestly, no manual index" pattern as
// useScheduleBlocks/useCourses. A 14-day sync window holds at most a few
// dozen events; core/time.ts's busyIntervals already sorts by startMin
// itself, so no consumer needs this pre-sorted.
export function useCalendarCache(): CalendarCacheEntry[] | undefined {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [resolved, setResolved] = useState<{ uid: string; entries: CalendarCacheEntry[] } | undefined>(
    undefined,
  );
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(collection(db, "users", uid, "calendarCache"), (snap) => {
      setResolved({
        uid,
        entries: snap.docs.map((d) => ({ _id: d.id, ...(d.data() as Omit<CalendarCacheEntry, "_id">) })),
      });
    });
  }, [uid]);
  return resolved?.uid === uid ? resolved.entries : undefined;
}

export function usePrefs(): Prefs | undefined {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [resolved, setResolved] = useState<{ uid: string; prefs: Prefs } | undefined>(undefined);
  useEffect(() => {
    if (!uid) return;
    // Single fixed-id document, not a collection — onSnapshot on a doc ref
    // still fires (with exists()===false) before the user has ever touched
    // /schedule, so this resolves to { _id: "prefs" } with every field
    // undefined rather than staying undefined forever. Defaulting
    // dayEndMin to 1260 (21:00) is a caller concern, not this hook's.
    return onSnapshot(doc(db, "users", uid, "settings", "prefs"), (snap) => {
      setResolved({ uid, prefs: { _id: "prefs", ...(snap.data() as Omit<Prefs, "_id"> | undefined) } });
    });
  }, [uid]);
  return resolved?.uid === uid ? resolved.prefs : undefined;
}

"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type Query,
} from "firebase/firestore";
import { auth, db } from "./client";
import { syncSessionCookie } from "./auth";
import type { Course, Task, TaskStatus } from "@/core/types";

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
      setResolved({ uid, tasks: rows.filter((t) => t.parentId === undefined) });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, ...deps]);
  return resolved?.uid === uid ? resolved.tasks : undefined;
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

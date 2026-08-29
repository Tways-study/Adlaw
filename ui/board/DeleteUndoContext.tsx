"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { remove, restore } from "@/firebase/tasks";
import { useAuth } from "@/firebase/hooks";
import type { Task } from "@/core/types";
import styles from "./DeleteUndoContext.module.css";

const UNDO_WINDOW_MS = 6000;

interface DeleteUndoContextValue {
  requestDelete: (task: Task) => void;
}

const DeleteUndoContext = createContext<DeleteUndoContextValue | null>(null);

export function useDeleteUndo(): DeleteUndoContextValue {
  const ctx = useContext(DeleteUndoContext);
  if (!ctx) throw new Error("useDeleteUndo must be used within DeleteUndoProvider");
  return ctx;
}

export function DeleteUndoProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [pending, setPending] = useState<{ task: Task; id: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const requestDelete = useCallback(
    (task: Task) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const id = ++idRef.current;
      setPending({ task, id });
      if (user) void remove(user.uid, task._id);
      timerRef.current = setTimeout(() => {
        setPending((current) => (current?.id === id ? null : current));
      }, UNDO_WINDOW_MS);
    },
    [user],
  );

  const handleUndo = useCallback(() => {
    if (!pending || !user) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const { task } = pending;
    setPending(null);
    void restore(user.uid, {
      rawText: task.rawText,
      title: task.title,
      courseId: task.courseId,
      estimateMin: task.estimateMin,
      dueAt: task.dueAt,
      status: task.status,
      laneOrder: task.laneOrder,
      // parentId/stepIndex: without these, undoing a deleted step (PRD M7 —
      // now visible and deletable in its own right, unlike before Slice 7)
      // would silently restore it as an orphaned top-level task instead of
      // putting it back in its parent's breakdown. excludedFromFocusUntil
      // (M8's "Not this one") is the same kind of state a delete shouldn't
      // erase out from under an undo.
      parentId: task.parentId,
      stepIndex: task.stepIndex,
      excludedFromFocusUntil: task.excludedFromFocusUntil,
      parseState: task.parseState,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
    });
  }, [pending, user]);

  return (
    <DeleteUndoContext.Provider value={{ requestDelete }}>
      {children}
      {pending && (
        <div className={styles.toast} role="status">
          <span>Deleted &ldquo;{pending.task.title}&rdquo;</span>
          <button className={styles.undo} onClick={handleUndo}>
            Undo
          </button>
        </div>
      )}
    </DeleteUndoContext.Provider>
  );
}

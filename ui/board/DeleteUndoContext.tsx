"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import styles from "./DeleteUndoContext.module.css";

const UNDO_WINDOW_MS = 6000;

interface DeleteUndoContextValue {
  requestDelete: (task: Doc<"tasks">) => void;
}

const DeleteUndoContext = createContext<DeleteUndoContextValue | null>(null);

export function useDeleteUndo(): DeleteUndoContextValue {
  const ctx = useContext(DeleteUndoContext);
  if (!ctx) throw new Error("useDeleteUndo must be used within DeleteUndoProvider");
  return ctx;
}

export function DeleteUndoProvider({ children }: { children: React.ReactNode }) {
  const remove = useMutation(api.tasks.remove);
  const restore = useMutation(api.tasks.restore);
  const [pending, setPending] = useState<{ task: Doc<"tasks">; id: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const requestDelete = useCallback(
    (task: Doc<"tasks">) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const id = ++idRef.current;
      setPending({ task, id });
      void remove({ id: task._id });
      timerRef.current = setTimeout(() => {
        setPending((current) => (current?.id === id ? null : current));
      }, UNDO_WINDOW_MS);
    },
    [remove],
  );

  const handleUndo = useCallback(() => {
    if (!pending) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const { task } = pending;
    setPending(null);
    void restore({
      rawText: task.rawText,
      title: task.title,
      courseId: task.courseId,
      estimateMin: task.estimateMin,
      dueAt: task.dueAt,
      status: task.status,
      laneOrder: task.laneOrder,
      parseState: task.parseState,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
    });
  }, [pending, restore]);

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

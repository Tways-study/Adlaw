"use client";

import { useState, type KeyboardEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useDeleteUndo } from "./DeleteUndoContext";
import { formatEstimate, formatDue } from "./format";
import { useDraggableCard } from "@/ui/drag/useDraggableCard";
import type { MovableStatus } from "@/ui/drag/types";
import styles from "./TaskCard.module.css";

interface TaskCardProps {
  task: Doc<"tasks">;
  courseLabel?: string;
  compact?: boolean;
  variant?: "default" | "done";
}

const KEY_TO_STATUS: Record<string, MovableStatus> = { "1": "shelf", "2": "next", "3": "now" };

// S5's "card expands in place" (docs/02-app-flow.md), scoped down to what
// Slice 2 actually has: read-only fields (M14 inline edit is Slice 8) plus
// Complete and Delete. Slice 3 adds movement: drag (useDraggableCard, below)
// and its exact keyboard equivalent — both build the same move() call, per
// docs/04-tdd.md's "the same mutation runs either way."
export function TaskCard({ task, courseLabel, compact = false, variant = "default" }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const complete = useMutation(api.tasks.complete);
  const uncomplete = useMutation(api.tasks.uncomplete);
  const move = useMutation(api.tasks.move);
  const { requestDelete } = useDeleteUndo();
  // Done cards are excluded from movement entirely — only complete/uncomplete
  // ever touch that state (see convex/tasks.ts's movableStatus validator).
  const draggable = useDraggableCard(task);

  if (variant === "done") {
    return (
      <article className={styles.doneCard}>
        <h4>{task.title}</h4>
        <button className={styles.undo} onClick={() => uncomplete({ id: task._id })}>
          Undo
        </button>
      </article>
    );
  }

  // A relative due-date label ("due Thursday"/"in 9d") reads the wall clock
  // directly rather than through state/memo — it's a per-render display
  // value, not something the component needs to track or react to.
  // eslint-disable-next-line react-hooks/purity
  const due = task.dueAt ? formatDue(task.dueAt, Date.now()) : undefined;

  function handleTriggerClick() {
    if (draggable.didDrag()) return;
    setExpanded((e) => !e);
  }

  function handleTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (expanded) return;
    const target = KEY_TO_STATUS[e.key];
    if (!target || target === task.status) return;
    e.preventDefault();
    void move({ id: task._id, status: target });
  }

  if (compact) {
    return (
      <>
        {draggable.placeholderHeight !== null && (
          <div className={styles.placeholder} style={{ height: draggable.placeholderHeight }} />
        )}
        <div className={styles.shelfItemWrap} data-task-id={task._id} {...draggable.rootProps}>
          <button
            className={styles.shelfItem}
            onClick={handleTriggerClick}
            onKeyDown={handleTriggerKeyDown}
            aria-expanded={expanded}
          >
            <span className={styles.t}>{task.title}</span>
            <span className={`${styles.d} num`}>{formatEstimate(task.estimateMin)}</span>
          </button>
          {expanded && (
            <div className={styles.detail}>
              {courseLabel && <span className={styles.course}>{courseLabel}</span>}
              <div className={styles.meta}>
                <span className="num">{formatEstimate(task.estimateMin)}</span>
                {due && (
                  <>
                    <i className={styles.dot} />
                    <span>{due}</span>
                  </>
                )}
              </div>
              <div className={styles.actions} data-drag-ignore>
                <button className={styles.btn} onClick={() => complete({ id: task._id })}>
                  Complete
                </button>
                <button className={styles.ghostbtn} onClick={() => requestDelete(task)}>
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {draggable.placeholderHeight !== null && (
        <div className={styles.placeholder} style={{ height: draggable.placeholderHeight }} />
      )}
      <article className={styles.card} data-task-id={task._id} {...draggable.rootProps}>
        <button
          className={styles.trigger}
          onClick={handleTriggerClick}
          onKeyDown={handleTriggerKeyDown}
          aria-expanded={expanded}
        >
          {courseLabel && <span className={styles.course}>{courseLabel}</span>}
          <h4>{task.title}</h4>
          <div className={styles.meta}>
            <span className="num">{formatEstimate(task.estimateMin)}</span>
            {due && (
              <>
                <i className={styles.dot} />
                <span>{due}</span>
              </>
            )}
          </div>
        </button>
        {expanded && (
          <div className={styles.actions} data-drag-ignore>
            <button className={styles.btn} onClick={() => complete({ id: task._id })}>
              Complete
            </button>
            <button className={styles.ghostbtn} onClick={() => requestDelete(task)}>
              Delete
            </button>
          </div>
        )}
      </article>
    </>
  );
}

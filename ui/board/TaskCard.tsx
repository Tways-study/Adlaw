"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { complete, uncomplete, move, applyParse, createSteps } from "@/firebase/tasks";
import { requestParse, requestBreakdown } from "@/firebase/ai";
import { useAuth, useCourses, useAllTasks, usePrefs } from "@/firebase/hooks";
import type { Task } from "@/core/types";
import type { BreakdownResult } from "@/ai/types";
import { useDeleteUndo } from "./DeleteUndoContext";
import { useFocus } from "./FocusContext";
import { useSplitSuggestion } from "./SplitSuggestionContext";
import { formatEstimate, formatDue } from "./format";
import { useDraggableCard } from "@/ui/drag/useDraggableCard";
import type { MovableStatus } from "@/ui/drag/types";
import styles from "./TaskCard.module.css";

interface TaskCardProps {
  task: Task;
  courseLabel?: string;
  compact?: boolean;
  variant?: "default" | "done";
}

const KEY_TO_STATUS: Record<string, MovableStatus> = { "1": "shelf", "2": "next", "3": "now" };

// A step's position in its parent breakdown (PRD M7: "Steps are schedulable;
// the parent is not"). The parent itself never renders as a card once it has
// steps (firebase/hooks.tsx's useTasksByStatus drops it), so the only way to
// show "Lab report · due Thursday · step 2 of 4" is to look the parent and
// its siblings up from the unfiltered listener.
interface StepInfo {
  parentLabel: string;
  stepLabel: string;
  stepsDone: number;
  stepsTotal: number;
}

function useStepInfo(task: Task): StepInfo | null {
  const allTasks = useAllTasks();
  return useMemo(() => {
    if (task.parentId === undefined || allTasks === undefined) return null;
    const parent = allTasks.find((t) => t._id === task.parentId);
    const siblings = allTasks
      .filter((t) => t.parentId === task.parentId)
      .sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0));
    const total = siblings.length;
    if (total === 0) return null;
    const idx = task.stepIndex ?? siblings.findIndex((s) => s._id === task._id);
    const stepNumber = Math.max(1, idx + 1);
    const parentTitle = parent?.title ?? "Parent task";
    // eslint-disable-next-line react-hooks/purity -- a due-date label reads the wall clock, same as formatDue's other callers below
    const parentDue = parent?.dueAt ? formatDue(parent.dueAt, Date.now()) : undefined;
    return {
      parentLabel: parentDue ? `${parentTitle} · ${parentDue}` : parentTitle,
      stepLabel: `step ${stepNumber} of ${total}`,
      stepsDone: stepNumber,
      stepsTotal: total,
    };
  }, [allTasks, task._id, task.parentId, task.stepIndex]);
}

function StepInfoBlock({ info }: { info: StepInfo }) {
  return (
    <div className={styles.parent}>
      <div className={styles.parentLabel}>
        <span>{info.parentLabel}</span>
        <span className="num">{info.stepLabel}</span>
      </div>
      <div className={styles.steps}>
        {Array.from({ length: info.stepsTotal }, (_, i) => (
          <span key={i} className={i < info.stepsDone ? styles.on : undefined} />
        ))}
      </div>
    </div>
  );
}

// S5's "card expands in place" (docs/02-app-flow.md), scoped down to what
// Slice 2 actually has: read-only fields (M14 inline edit is Slice 8) plus
// Complete and Delete. Slice 3 adds movement: drag (useDraggableCard, below)
// and its exact keyboard equivalent — both build the same move() call, per
// docs/04-tdd.md's "the same mutation runs either way." Slice 7 adds a quiet
// parse-fallback retry, an on-demand breakdown (M7), and the focus pick's
// reason + "Not this one" (M8) on the one "now" card.
export function TaskCard({ task, courseLabel, compact = false, variant = "default" }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [breakdown, setBreakdown] = useState<BreakdownResult | null>(null);
  const [breakdownBusy, setBreakdownBusy] = useState(false);
  const { user } = useAuth();
  const courses = useCourses();
  const prefs = usePrefs();
  const { requestDelete } = useDeleteUndo();
  const focus = useFocus();
  const splitSuggestion = useSplitSuggestion();
  const stepInfo = useStepInfo(task);
  // Done cards are excluded from movement entirely — only complete/uncomplete
  // ever touch that state (see core/types.ts's MovableStatus).
  const draggable = useDraggableCard(task);

  if (variant === "done") {
    return (
      <article className={styles.doneCard}>
        <h4>{task.title}</h4>
        <button className={styles.undo} onClick={() => user && uncomplete(user.uid, task._id)}>
          Undo
        </button>
      </article>
    );
  }

  const isNow = task.status === "now";
  const reason = isNow && focus.reason?.taskId === task._id ? focus.reason.text : undefined;
  // Steps (task.parentId set) never re-split — M7 is a single flat level.
  const canBreakDown = task.parentId === undefined;
  const suggested = canBreakDown && splitSuggestion.isSuggested(task._id);

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
    if (user) void move(user.uid, task._id, target);
  }

  // "A user action leaves `now` empty" (docs/04-tdd.md) — completing the
  // active task is exactly that action, so re-picking here, inside the same
  // click handler, is still user-triggered, never a background timer.
  async function handleComplete() {
    if (!user) return;
    const wasNow = isNow;
    await complete(user.uid, task._id);
    if (wasNow) focus.pick();
  }

  // CLAUDE.md: "mark parse_state = 'fallback' and offer a quiet retry."
  // Quiet means this button, not a toast or a modal — one tap re-runs the
  // model on this card's original text.
  async function handleRetryParse() {
    if (!user || retrying) return;
    setRetrying(true);
    try {
      const courseCodes = courses?.map((c) => c.code);
      const { result, log } = await requestParse(user.uid, task.rawText, Date.now(), courseCodes, {
        aiProvider: prefs?.aiProvider,
        aiModel: prefs?.aiModel,
      });
      await applyParse(user.uid, task._id, {
        title: result.title,
        courseCode: result.courseCode,
        estimateMin: result.estimateMin,
        dueAt: result.dueAt,
        parseState: log.ok ? "ok" : "fallback",
      });
      if (result.shouldSplit) splitSuggestion.suggest(task._id);
    } finally {
      setRetrying(false);
    }
  }

  // M7: "Triggered when the parse flags shouldSplit, or on demand." Both
  // paths land here — this only proposes steps; nothing is written until
  // handleAcceptBreakdown.
  async function handleRequestBreakdown() {
    if (!user || breakdownBusy) return;
    setBreakdownBusy(true);
    try {
      const { result } = await requestBreakdown(user.uid, task, {
        aiProvider: prefs?.aiProvider,
        aiModel: prefs?.aiModel,
      });
      setBreakdown(result);
    } finally {
      setBreakdownBusy(false);
    }
  }

  async function handleAcceptBreakdown() {
    if (!user || !breakdown) return;
    await createSteps(user.uid, task._id, breakdown.steps);
    setBreakdown(null);
    splitSuggestion.dismiss(task._id);
  }

  function handleCancelBreakdown() {
    setBreakdown(null);
  }

  function handleDismissSplitSuggestion() {
    splitSuggestion.dismiss(task._id);
  }

  const breakdownPreview = breakdown && (
    <div className={styles.breakdownPreview} data-drag-ignore>
      <ul className={styles.stepList}>
        {breakdown.steps.map((step, i) => (
          <li key={i}>
            <span>{step.title}</span>
            <span className="num">{formatEstimate(step.estimateMin)}</span>
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <button className={styles.btn} onClick={() => void handleAcceptBreakdown()}>
          Add {breakdown.steps.length} steps
        </button>
        <button className={styles.ghostbtn} onClick={handleCancelBreakdown}>
          Never mind
        </button>
      </div>
    </div>
  );

  const splitOffer = suggested && !breakdown && (
    <div className={styles.splitOffer} data-drag-ignore>
      <span>This looks big — break it into steps?</span>
      <div className={styles.splitOfferActions}>
        <button className={styles.linkbtn} onClick={() => void handleRequestBreakdown()} disabled={breakdownBusy}>
          {breakdownBusy ? "Breaking down…" : "Break down"}
        </button>
        <button className={styles.linkbtn} onClick={handleDismissSplitSuggestion}>
          Not now
        </button>
      </div>
    </div>
  );

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
            <span className={`${styles.d} num`}>
              {formatEstimate(task.estimateMin)}
              {stepInfo ? ` · ${stepInfo.stepLabel}` : ""}
            </span>
          </button>
          {task.parseState === "fallback" && (
            <button className={styles.retryBtn} onClick={() => void handleRetryParse()} disabled={retrying}>
              {retrying ? "Retrying…" : "Retry parse"}
            </button>
          )}
          {splitOffer}
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
              {stepInfo && <StepInfoBlock info={stepInfo} />}
              {breakdownPreview}
              <div className={styles.actions} data-drag-ignore>
                <button className={styles.btn} onClick={() => void handleComplete()}>
                  Complete
                </button>
                {canBreakDown && !breakdown && (
                  <button
                    className={styles.ghostbtn}
                    onClick={() => void handleRequestBreakdown()}
                    disabled={breakdownBusy}
                  >
                    {breakdownBusy ? "Breaking down…" : "Break into steps"}
                  </button>
                )}
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
      <article className={`${styles.card}${isNow ? ` ${styles.focus}` : ""}`} data-task-id={task._id} {...draggable.rootProps}>
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
          {/* The AI's one-line reason (PRD M8) — always visible, never gated
              behind expand, since "what do I start" is the answer to cold
              start and shouldn't need a click to read. */}
          {reason && <p className={styles.reason}>{reason}</p>}
          {stepInfo && <StepInfoBlock info={stepInfo} />}
        </button>
        {task.parseState === "fallback" && (
          <button className={styles.retryBtn} onClick={() => void handleRetryParse()} disabled={retrying}>
            {retrying ? "Retrying…" : "Retry parse"}
          </button>
        )}
        {splitOffer}
        {breakdownPreview}
        {expanded && (
          <div className={styles.actions} data-drag-ignore>
            <button className={styles.btn} onClick={() => void handleComplete()}>
              Complete
            </button>
            {isNow && (
              <button className={styles.ghostbtn} onClick={() => focus.notThisOne(task._id)}>
                Not this one
              </button>
            )}
            {canBreakDown && !breakdown && (
              <button
                className={styles.ghostbtn}
                onClick={() => void handleRequestBreakdown()}
                disabled={breakdownBusy}
              >
                {breakdownBusy ? "Breaking down…" : "Break into steps"}
              </button>
            )}
            <button className={styles.ghostbtn} onClick={() => requestDelete(task)}>
              Delete
            </button>
          </div>
        )}
      </article>
    </>
  );
}

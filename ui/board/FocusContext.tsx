"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { requestFocus } from "@/firebase/ai";
import { excludeFromFocusToday } from "@/firebase/tasks";
import { useAuth, usePrefs, useTasksByStatus } from "@/firebase/hooks";
import { useDayPlan } from "./useDayPlan";
import type { FocusQueueTask } from "@/ai/types";

// PRD M8. requestFocus (firebase/ai.ts) already applies the pick through
// move() and writes aiLog itself — this context's only jobs are (1) build
// the candidate queue + windows every call needs, (2) hold the one-line
// reason so the "now" card can show it, and (3) implement "Not this one"
// as exclude-then-repick. "Every AI call is user-triggered" (CLAUDE.md): the
// only entry points are pick() and notThisOne(), both wired to real button
// clicks (ui/board/StartHere.tsx's empty-state button, ui/board/TaskCard.tsx's
// Complete handler for the current "now" task, and its "Not this one" button)
// — nothing here runs on a timer, on load, or in the background.
interface FocusPickReason {
  taskId: string;
  text: string;
}

interface FocusContextValue {
  reason: FocusPickReason | null;
  picking: boolean;
  /** Whether there is any shelf/next task to pick from at all. */
  canPick: boolean;
  pick: () => void;
  notThisOne: (taskId: string) => void;
}

const FocusContext = createContext<FocusContextValue | null>(null);

export function useFocus(): FocusContextValue {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocus must be used within FocusProvider");
  return ctx;
}

function endOfLocalDay(now: number): number {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function FocusProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // The candidate pool is shelf ∪ next — deliberately wider than "next
  // alone." Cold start (PRD's ranked failure #2) is exactly "deciding what
  // to do next costs more than doing it," and gating focus pick behind a
  // manual shelf-to-next triage step first would reintroduce the same
  // decision the pick exists to remove.
  const shelfTasks = useTasksByStatus("shelf");
  const nextTasks = useTasksByStatus("next");
  const plan = useDayPlan();
  const prefs = usePrefs();

  const [reason, setReason] = useState<FocusPickReason | null>(null);
  const [picking, setPicking] = useState(false);

  const candidates = useMemo<FocusQueueTask[]>(() => {
    const pool = [...(nextTasks ?? []), ...(shelfTasks ?? [])];
    return pool.map((t) => ({
      _id: t._id,
      estimateMin: t.estimateMin,
      dueAt: t.dueAt,
      excludedFromFocusUntil: t.excludedFromFocusUntil,
    }));
  }, [shelfTasks, nextTasks]);

  const canPick = candidates.length > 0;

  const pick = useCallback(() => {
    if (!user || !plan || picking) return;
    setPicking(true);
    void requestFocus(user.uid, candidates, plan.windows, Date.now(), {
      aiProvider: prefs?.aiProvider,
      aiModel: prefs?.aiModel,
    })
      .then((outcome) => {
        setReason(
          outcome.result.taskId ? { taskId: outcome.result.taskId, text: outcome.result.reason } : null,
        );
      })
      .finally(() => setPicking(false));
  }, [user, plan, picking, candidates, prefs]);

  const notThisOne = useCallback(
    (taskId: string) => {
      if (!user) return;
      setReason(null);
      // The rejected task is still "now" at this point, so it's outside the
      // shelf/next candidate pool above by construction — no need to strip
      // it out of `candidates` before re-picking. Writing the exclusion
      // first is what makes it stick once requestFocus's own move() demotes
      // it back into "next" a moment later.
      void excludeFromFocusToday(user.uid, taskId, endOfLocalDay(Date.now())).then(() => pick());
    },
    [user, pick],
  );

  const value = useMemo(
    () => ({ reason, picking, canPick, pick, notThisOne }),
    [reason, picking, canPick, pick, notThisOne],
  );

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

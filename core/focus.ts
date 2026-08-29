// Pure. No I/O, no React, no Firebase imports — see CLAUDE.md's module-
// boundary rule. This is the fallback (and, until an AI key exists, the
// *only*) focus-pick logic: HeuristicParser.focus's real implementation —
// "picks by earliest due date that fits the current window" per
// docs/04-tdd.md. Deterministic math never goes through the model.

import type { Window } from "./time";

export interface FocusCandidate {
  _id: string;
  estimateMin: number;
  dueAt?: number;
  excludedFromFocusUntil?: number;
}

export interface FocusPickResult {
  taskId: string | null;
  reason: string;
}

/**
 * Picks one candidate for `now`. Ranks by earliest due date (undated tasks
 * sort last, never first — an undated task should never bump a dated one
 * out of focus), then prefers the earliest-due candidate whose estimate
 * fits inside today's remaining free time (the sum of `windows`). If no
 * candidate fits, still picks the most urgent one rather than picking
 * nothing — the cutline and capacity slot are what surface the mismatch;
 * focus pick's only job is to choose, never to block.
 *
 * Returns `{ taskId: null, ... }` only when every candidate is currently
 * excluded (M8's "Not this one") or the queue itself is empty — a valid,
 * quiet answer, not an error.
 */
export function pickFocus(
  candidates: FocusCandidate[],
  windows: Window[],
  now: number,
): FocusPickResult {
  const freeMin = windows.reduce((sum, w) => sum + (w.endMin - w.startMin), 0);

  const eligible = candidates.filter(
    (c) => c.excludedFromFocusUntil === undefined || c.excludedFromFocusUntil <= now,
  );
  if (eligible.length === 0) {
    return { taskId: null, reason: "Nothing left to focus on today." };
  }

  const sorted = [...eligible].sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity));

  const fits = sorted.find((c) => c.estimateMin <= freeMin);
  if (fits) {
    return {
      taskId: fits._id,
      reason:
        fits.dueAt !== undefined
          ? "Due soonest, and it fits your remaining time today."
          : "Fits your remaining time today.",
    };
  }

  return {
    taskId: sorted[0]._id,
    reason: "Due soonest — it may not fit the time left today.",
  };
}

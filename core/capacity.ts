// Pure. No I/O, no React, no Firebase imports — see CLAUDE.md's module-
// boundary rule. See core/time.ts's freeWindows for how `windows` is
// produced; this module never looks at calendar events or schedule blocks
// directly — Calendar only ever feeds freeWindows, one layer below (per
// docs/04-tdd.md's "no AI call and no Calendar sync may produce any value in
// CapacityResult directly").

import type { Window } from "./time";
import type { Task } from "./types";

export interface PlannedBlock {
  taskId: string;
  startMin: number;
  endMin: number;
  spill: boolean; // true once free time has run out — never dropped, just flagged
}

export interface CapacityResult {
  freeMin: number;
  plannedMin: number;
  /**
   * How far the plan runs past the end of the last free window — NOT
   * `plannedMin - freeMin`. Those two differ whenever packing strands an
   * unusable remainder: with windows 10:00–11:00 and 11:40–12:40 and a
   * 45/45/30 queue, `plannedMin` and `freeMin` are both 120, but the second
   * 45 can't fit the first window's last 15 minutes, so the 30 lands past
   * the edge. Subtracting the pools would report "fits exactly" while
   * `cutIndex` and `blocks[].spill` both say the day ran out.
   *
   * Defined off the same walk instead, which makes the guarantee structural:
   * `overageMin > 0` exactly when `cutIndex !== null`. The capacity slot,
   * the cutline, and Today's shape cannot contradict each other because all
   * three read one result of one function (docs/04-tdd.md: "One computation
   * feeds all four capacity surfaces").
   */
  overageMin: number;
  cutIndex: number | null;
  blocks: PlannedBlock[];
}

/**
 * Packs `queue` (in order) into `windows` (already sorted, non-overlapping —
 * freeWindows guarantees this). One cursor walks forward through both:
 *
 *   1. If the task fits the remainder of the current window, place it at
 *      the cursor and advance the cursor by its duration.
 *   2. If it doesn't, and a later window exists, jump the cursor to that
 *      window's start and retry (repeat until it fits or windows run out).
 *   3. Once windows run out — no later window, or `windows` was empty to
 *      begin with — every task from here on is placed at the cursor and
 *      flagged `spill`, and the cursor keeps advancing by each task's full
 *      duration. Nothing is ever dropped.
 *
 * Step 3's first placement lands exactly at the last window's start (cursor
 * hasn't moved past it yet); every spill task after that stacks after the
 * previous one's end rather than resetting back to that same point, so a
 * timeline can render each one at a distinct position past the edge instead
 * of a pile of identical-start blocks.
 */
export function layout(queue: Task[], windows: Window[], nowMin: number): CapacityResult {
  const freeMin = windows.reduce((sum, w) => sum + (w.endMin - w.startMin), 0);

  let wi = 0;
  let cursor = windows.length > 0 ? Math.max(nowMin, windows[0].startMin) : nowMin;
  let overrun = windows.length === 0;

  const blocks: PlannedBlock[] = [];
  let plannedMin = 0;
  let cutIndex: number | null = null;

  for (let i = 0; i < queue.length; i++) {
    const duration = queue[i].estimateMin;

    if (!overrun) {
      while (cursor + duration > windows[wi].endMin) {
        if (wi + 1 < windows.length) {
          wi += 1;
          cursor = windows[wi].startMin;
        } else {
          overrun = true;
          break;
        }
      }
    }

    const start = cursor;
    const end = start + duration;
    blocks.push({ taskId: queue[i]._id, startMin: start, endMin: end, spill: overrun });
    plannedMin += duration;
    cursor = end;

    if (overrun && cutIndex === null) cutIndex = i;
  }

  // See CapacityResult.overageMin for why this is measured against the last
  // window's end rather than against the free-minute pool.
  const lastWindowEnd = windows.length > 0 ? windows[windows.length - 1].endMin : nowMin;
  const planEnd = blocks.length > 0 ? blocks[blocks.length - 1].endMin : cursor;

  return { freeMin, plannedMin, overageMin: Math.max(0, planEnd - lastWindowEnd), cutIndex, blocks };
}

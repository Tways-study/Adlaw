"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrefs, useScheduleBlocks, useTasksByStatus } from "@/firebase/hooks";
import { busyIntervals, freeWindows, resolveDayEnd, type BusyInterval, type Window } from "@/core/time";
import { layout, type CapacityResult } from "@/core/capacity";
import type { Task } from "@/core/types";

// core/time.ts deliberately does not apply this default (see its
// resolveDayEnd doc comment) — "Day edge is editable, defaulting to 21:00"
// is a UI-layer decision, applied here, once, for every caller.
const DEFAULT_DAY_END_MIN = 1260;

// calendarCache/Slice 6 isn't built yet — every core/time call below takes
// [] for events, exactly like the plan's "callers pass [] today" note on
// core/time.ts's CalendarEvent type. Wiring the real cache later only
// touches this one line.
const NO_CALENDAR_EVENTS: never[] = [];

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function useNowMin(): number {
  const [nowMin, setNowMin] = useState(() => minutesSinceMidnight(new Date()));
  useEffect(() => {
    const id = setInterval(() => setNowMin(minutesSinceMidnight(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);
  return nowMin;
}

export interface DayPlan extends CapacityResult {
  /** The committed track (schedule blocks; calendar events once Slice 6 lands). */
  busyIntervals: BusyInterval[];
  /** Resolved evening cutoff for today — a work block, or the prefs default. */
  dayEndMin: number;
  /** Minutes past local midnight, ticking every 60s. */
  nowMin: number;
  /** [now task, ...next tasks] — the exact queue layout() was packed against. */
  queue: Task[];
  /**
   * Today's free windows — the same array freeWindows() derived and layout()
   * packed against. Exposed so a focus pick (M8, ui/board/FocusContext.tsx)
   * can hand core/focus.ts's pickFocus the real remaining-time figure without
   * recomputing it (and risking disagreeing with the capacity slot).
   */
  windows: Window[];
}

/**
 * The single composition point for every capacity-derived surface. Reads
 * useScheduleBlocks() + usePrefs() + the now/next queues + a 60s now-min
 * ticker, resolves the day edge, derives free windows, and packs the queue —
 * once. The capacity slot, the cutline, and Today's shape all read this one
 * hook's result; none of them may call core/capacity's layout() themselves,
 * because "overageMin > 0 exactly when cutIndex !== null" is only a
 * guarantee across the whole UI if there is exactly one place computing it
 * (docs/04-tdd.md: "One computation feeds all four capacity surfaces").
 *
 * Returns undefined while any dependency (schedule, prefs, or either queue)
 * is still loading — callers render their existing skeleton/loading state
 * for that, same as every other firebase/hooks.tsx consumer.
 */
export function useDayPlan(): DayPlan | undefined {
  const blocks = useScheduleBlocks();
  const prefs = usePrefs();
  const nowTasks = useTasksByStatus("now");
  const nextTasks = useTasksByStatus("next");
  const nowMin = useNowMin();

  return useMemo(() => {
    if (blocks === undefined || prefs === undefined || nowTasks === undefined || nextTasks === undefined) {
      return undefined;
    }

    // Re-derived on every recompute rather than cached in state — a board
    // left open across midnight rolls to the new day within a minute, via
    // the nowMin tick above triggering this memo to re-run.
    const date = new Date();
    const cutoffMin = prefs.dayEndMin ?? DEFAULT_DAY_END_MIN;
    const dayEndMin = resolveDayEnd(blocks, date, nowMin, cutoffMin);
    const windows = freeWindows(blocks, NO_CALENDAR_EVENTS, date, nowMin, dayEndMin);
    const busy = busyIntervals(blocks, NO_CALENDAR_EVENTS, date);

    // At most one "now" task ever exists (firebase/tasks.ts's one-"now"
    // invariant) — this still reads correctly if that were ever violated,
    // since every element of nowTasks lands ahead of "next" either way.
    const queue: Task[] = [...nowTasks, ...nextTasks];
    const result = layout(queue, windows, nowMin);

    return { ...result, busyIntervals: busy, dayEndMin, nowMin, queue, windows };
  }, [blocks, prefs, nowTasks, nextTasks, nowMin]);
}

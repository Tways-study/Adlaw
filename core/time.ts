// Pure. No I/O, no React, no Firebase imports — see CLAUDE.md's module-
// boundary rule. Everything here is minutes past local midnight (0–1439) for
// one given date; conversion to/from clock strings happens in ui/, and
// conversion from epoch-ms calendar events happens only at this module's
// boundary (busyIntervals), never inside core/capacity.

import type { BlockKind, ScheduleBlock } from "./types";

export interface Window {
  startMin: number;
  endMin: number;
}

export interface BusyInterval {
  startMin: number;
  endMin: number;
  label: string;
  kind: BlockKind | "event";
}

// Mirrors calendarCache's shape (docs/03-backend-schema.md) minus the fields
// core/time has no use for. events is always [] until Slice 6 wires up
// firebase/hooks.tsx's calendarCache listener — callers pass [] today.
export interface CalendarEvent {
  startsAt: number; // epoch ms
  endsAt: number; // epoch ms
  title: string;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Built from calendar day boundaries (setHours/setDate), never from a fixed
// 86_400_000ms offset — a fixed offset is wrong on a DST-transition day,
// where local midnight-to-midnight is 23h or 25h of elapsed time. Schedule
// blocks need no such care (they're minutes-past-local-midnight already);
// this is only for converting epoch-ms calendar events at this boundary.
function dayBoundsMs(date: Date): { start: number; end: number } {
  const start = startOfDay(date).getTime();
  const end = startOfDay(addDays(date, 1)).getTime();
  return { start, end };
}

// A block counts as active for `date` when [activeFrom, activeTo ?? +Inf)
// overlaps [dayStart, dayEnd) — a half-open interval test, so a block ended
// (activeTo set) exactly at today's midnight no longer applies today, and a
// block starting exactly at today's midnight does.
function isBlockActiveOn(block: ScheduleBlock, date: Date): boolean {
  if (block.weekday !== date.getDay()) return false;
  const { start, end } = dayBoundsMs(date);
  if (block.activeFrom >= end) return false;
  if (block.activeTo !== undefined && block.activeTo <= start) return false;
  return true;
}

/**
 * Labelled, sorted busy intervals for `date` — the committed track. Each
 * schedule block and each overlapping calendar event is its own entry
 * (never merged — merging would destroy the label), sorted by start time.
 * Overlap merging for capacity purposes happens only inside freeWindows,
 * which needs ranges, not labels.
 */
export function busyIntervals(
  blocks: ScheduleBlock[],
  events: CalendarEvent[],
  date: Date,
): BusyInterval[] {
  const { start: dayStart, end: dayEnd } = dayBoundsMs(date);

  const fromBlocks: BusyInterval[] = blocks
    .filter((b) => isBlockActiveOn(b, date))
    .map((b) => ({ startMin: b.startMin, endMin: b.endMin, label: b.label, kind: b.kind }));

  const fromEvents: BusyInterval[] = events
    .filter((e) => e.startsAt < dayEnd && e.endsAt > dayStart) // overlaps this day at all
    .map((e) => ({
      startMin: Math.max(0, Math.round((e.startsAt - dayStart) / 60000)),
      endMin: Math.min(1440, Math.round((e.endsAt - dayStart) / 60000)),
      label: e.title,
      kind: "event" as const,
    }))
    .filter((iv) => iv.endMin > iv.startMin); // clipped away to nothing by day bounds

  return [...fromBlocks, ...fromEvents].sort(
    (a, b) => a.startMin - b.startMin || a.endMin - b.endMin,
  );
}

/**
 * The evening cutoff: the first "work" block starting after nowMin, else
 * cutoffMin (settings/prefs.dayEndMin, defaulted by the caller — this
 * function never applies the 1260/21:00 default itself, that's a UI-layer
 * concern per the plan's "Day edge is editable" decision).
 */
export function resolveDayEnd(
  blocks: ScheduleBlock[],
  date: Date,
  nowMin: number,
  cutoffMin: number,
): number {
  const candidates = blocks
    .filter((b) => b.kind === "work" && b.startMin > nowMin && isBlockActiveOn(b, date))
    .map((b) => b.startMin);
  return candidates.length > 0 ? Math.min(...candidates) : cutoffMin;
}

/**
 * Free windows for `date`, clipped to [nowMin, dayEndMin]. Selects active
 * blocks by weekday + activeFrom/activeTo, merges in calendar events,
 * merges all overlaps (via the cursor below — no separate merge pass is
 * needed because busy intervals are processed in sorted order and the
 * cursor already absorbs overlap via Math.max), inverts against the day.
 *
 * The strict `>` in the loop below (not `>=`) is what guarantees no
 * zero-length window is ever produced when one block ends exactly as
 * another begins.
 */
export function freeWindows(
  blocks: ScheduleBlock[],
  events: CalendarEvent[],
  date: Date,
  nowMin: number,
  dayEndMin: number,
): Window[] {
  if (dayEndMin <= nowMin) return [];

  const busy = busyIntervals(blocks, events, date)
    .map((iv) => ({
      startMin: Math.max(iv.startMin, nowMin),
      endMin: Math.min(iv.endMin, dayEndMin),
    }))
    .filter((iv) => iv.endMin > iv.startMin)
    .sort((a, b) => a.startMin - b.startMin);

  const windows: Window[] = [];
  let cursor = nowMin;
  for (const iv of busy) {
    if (iv.startMin > cursor) windows.push({ startMin: cursor, endMin: iv.startMin });
    cursor = Math.max(cursor, iv.endMin);
  }
  if (cursor < dayEndMin) windows.push({ startMin: cursor, endMin: dayEndMin });
  return windows;
}

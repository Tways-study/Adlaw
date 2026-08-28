import { describe, expect, it } from "vitest";
import { busyIntervals, freeWindows, resolveDayEnd, type CalendarEvent } from "./time";
import type { ScheduleBlock } from "./types";

// A fixed Wednesday, at local midnight, so getDay() === 3 unambiguously.
const WEDNESDAY = new Date(2026, 7, 19, 0, 0, 0, 0);

function block(overrides: Partial<ScheduleBlock>): ScheduleBlock {
  return {
    _id: "b",
    weekday: 3,
    startMin: 540,
    endMin: 600,
    label: "class",
    kind: "class",
    activeFrom: new Date(2026, 0, 1).getTime(),
    ...overrides,
  };
}

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return { startsAt: 0, endsAt: 0, title: "event", ...overrides };
}

describe("busyIntervals", () => {
  it("returns sorted, labelled intervals for active blocks", () => {
    const blocks = [
      block({ _id: "b2", startMin: 780, endMin: 840, label: "second" }),
      block({ _id: "b1", startMin: 540, endMin: 600, label: "first" }),
    ];
    const result = busyIntervals(blocks, [], WEDNESDAY);
    expect(result.map((r) => r.label)).toEqual(["first", "second"]);
  });

  it("excludes a block on a different weekday", () => {
    const blocks = [block({ weekday: 1 })]; // Monday
    expect(busyIntervals(blocks, [], WEDNESDAY)).toEqual([]);
  });

  it("excludes a block whose activeFrom is after this date", () => {
    const blocks = [block({ activeFrom: new Date(2027, 0, 1).getTime() })];
    expect(busyIntervals(blocks, [], WEDNESDAY)).toEqual([]);
  });

  it("excludes a block whose activeTo is before this date", () => {
    const blocks = [block({ activeTo: new Date(2026, 0, 2).getTime() })];
    expect(busyIntervals(blocks, [], WEDNESDAY)).toEqual([]);
  });

  it("includes a block whose activeTo falls later today (still active on this date)", () => {
    const laterToday = new Date(2026, 7, 19, 23, 0, 0, 0).getTime();
    const blocks = [block({ activeTo: laterToday })];
    expect(busyIntervals(blocks, [], WEDNESDAY)).toHaveLength(1);
  });

  it("keeps two overlapping blocks as two separate labelled entries", () => {
    const blocks = [
      block({ _id: "b1", startMin: 540, endMin: 620, label: "a" }),
      block({ _id: "b2", startMin: 600, endMin: 660, label: "b" }),
    ];
    expect(busyIntervals(blocks, [], WEDNESDAY)).toHaveLength(2);
  });

  it("converts a calendar event overlapping the day into minutes, clipped to [0,1440]", () => {
    // Event starts the day before at 23:30 and ends 01:00 into WEDNESDAY —
    // crosses midnight relative to WEDNESDAY.
    const dayStart = WEDNESDAY.getTime();
    const events = [
      event({ startsAt: dayStart - 30 * 60000, endsAt: dayStart + 60 * 60000, title: "late thing" }),
    ];
    const [iv] = busyIntervals([], events, WEDNESDAY);
    expect(iv.startMin).toBe(0);
    expect(iv.endMin).toBe(60);
  });

  it("clips an event ending after this day's midnight to 1440, not past it", () => {
    const dayStart = WEDNESDAY.getTime();
    const events = [
      event({ startsAt: dayStart + 23 * 60 * 60000, endsAt: dayStart + 26 * 60 * 60000, title: "overnight" }),
    ];
    const [iv] = busyIntervals([], events, WEDNESDAY);
    expect(iv.endMin).toBe(1440);
  });

  it("drops an event that doesn't overlap this day at all", () => {
    const events = [
      event({ startsAt: new Date(2026, 0, 1).getTime(), endsAt: new Date(2026, 0, 1, 1).getTime() }),
    ];
    expect(busyIntervals([], events, WEDNESDAY)).toEqual([]);
  });
});

describe("resolveDayEnd", () => {
  it("returns the cutoff when there are no work blocks", () => {
    expect(resolveDayEnd([], WEDNESDAY, 600, 1260)).toBe(1260);
  });

  it("returns the first work block starting after nowMin", () => {
    const blocks = [block({ kind: "work", startMin: 960, endMin: 1080 })];
    expect(resolveDayEnd(blocks, WEDNESDAY, 600, 1260)).toBe(960);
  });

  it("picks the earliest among multiple qualifying work blocks", () => {
    const blocks = [
      block({ _id: "w1", kind: "work", startMin: 1000, endMin: 1060 }),
      block({ _id: "w2", kind: "work", startMin: 900, endMin: 960 }),
    ];
    expect(resolveDayEnd(blocks, WEDNESDAY, 600, 1260)).toBe(900);
  });

  it("ignores a work block that already started before nowMin", () => {
    const blocks = [block({ kind: "work", startMin: 500, endMin: 560 })];
    expect(resolveDayEnd(blocks, WEDNESDAY, 600, 1260)).toBe(1260);
  });

  it("ignores non-work blocks entirely", () => {
    const blocks = [block({ kind: "class", startMin: 960, endMin: 1080 })];
    expect(resolveDayEnd(blocks, WEDNESDAY, 600, 1260)).toBe(1260);
  });
});

describe("freeWindows", () => {
  it("returns one window spanning [nowMin, dayEndMin] with no blocks and no events", () => {
    expect(freeWindows([], [], WEDNESDAY, 600, 1260)).toEqual([{ startMin: 600, endMin: 1260 }]);
  });

  it("returns no windows on a fully booked day", () => {
    const blocks = [block({ startMin: 600, endMin: 1260 })];
    expect(freeWindows(blocks, [], WEDNESDAY, 600, 1260)).toEqual([]);
  });

  it("merges overlapping blocks instead of double-counting the gap", () => {
    const blocks = [
      block({ _id: "b1", startMin: 600, endMin: 700 }),
      block({ _id: "b2", startMin: 660, endMin: 760 }),
    ];
    expect(freeWindows(blocks, [], WEDNESDAY, 600, 1260)).toEqual([{ startMin: 760, endMin: 1260 }]);
  });

  it("merges a calendar event overlapping a schedule block into one gap, not double-subtracted", () => {
    const blocks = [block({ startMin: 600, endMin: 700 })];
    const dayStart = WEDNESDAY.getTime();
    const events = [event({ startsAt: dayStart + 650 * 60000, endsAt: dayStart + 720 * 60000 })];
    expect(freeWindows(blocks, events, WEDNESDAY, 600, 1260)).toEqual([{ startMin: 720, endMin: 1260 }]);
  });

  it("produces no zero-length window when one block ends exactly as another begins", () => {
    const blocks = [
      block({ _id: "b1", startMin: 600, endMin: 660 }),
      block({ _id: "b2", startMin: 660, endMin: 720 }),
    ];
    const windows = freeWindows(blocks, [], WEDNESDAY, 600, 1260);
    expect(windows).toEqual([{ startMin: 720, endMin: 1260 }]);
    expect(windows.some((w) => w.startMin === w.endMin)).toBe(false);
  });

  it("degrades silently with an empty calendarCache (events=[])", () => {
    expect(() => freeWindows([], [], WEDNESDAY, 600, 1260)).not.toThrow();
  });

  it("returns [] when dayEndMin is at or before nowMin", () => {
    expect(freeWindows([], [], WEDNESDAY, 1260, 1260)).toEqual([]);
    expect(freeWindows([], [], WEDNESDAY, 1300, 1260)).toEqual([]);
  });

  it("produces two windows around a single mid-day block", () => {
    const blocks = [block({ startMin: 700, endMin: 760 })];
    expect(freeWindows(blocks, [], WEDNESDAY, 600, 1260)).toEqual([
      { startMin: 600, endMin: 700 },
      { startMin: 760, endMin: 1260 },
    ]);
  });
});

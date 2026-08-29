import { describe, expect, test } from "vitest";
import { pickFocus, type FocusCandidate } from "./focus";
import type { Window } from "./time";

const NOW = new Date("2026-08-29T09:00:00").getTime();
const DAY = 24 * 60 * 60 * 1000;

describe("pickFocus", () => {
  test("an empty queue picks nothing", () => {
    expect(pickFocus([], [{ startMin: 0, endMin: 120 }], NOW)).toEqual({
      taskId: null,
      reason: "Nothing left to focus on today.",
    });
  });

  test("a queue that is entirely excluded picks nothing", () => {
    const candidates: FocusCandidate[] = [
      { _id: "a", estimateMin: 30, excludedFromFocusUntil: NOW + DAY },
    ];
    const result = pickFocus(candidates, [{ startMin: 0, endMin: 120 }], NOW);
    expect(result.taskId).toBeNull();
  });

  test("a candidate whose exclusion has already lapsed is eligible again", () => {
    const candidates: FocusCandidate[] = [
      { _id: "a", estimateMin: 30, excludedFromFocusUntil: NOW - 1 },
    ];
    const result = pickFocus(candidates, [{ startMin: 0, endMin: 120 }], NOW);
    expect(result.taskId).toBe("a");
  });

  test("among candidates that fit, the earliest due date wins", () => {
    const candidates: FocusCandidate[] = [
      { _id: "later", estimateMin: 30, dueAt: NOW + 2 * DAY },
      { _id: "sooner", estimateMin: 30, dueAt: NOW + DAY },
    ];
    const result = pickFocus(candidates, [{ startMin: 0, endMin: 120 }], NOW);
    expect(result.taskId).toBe("sooner");
  });

  test("an earlier-due task that doesn't fit is skipped in favor of one that does", () => {
    const windows: Window[] = [{ startMin: 0, endMin: 60 }]; // 60 free minutes
    const candidates: FocusCandidate[] = [
      { _id: "too-big", estimateMin: 90, dueAt: NOW + DAY },
      { _id: "fits", estimateMin: 30, dueAt: NOW + 2 * DAY },
    ];
    const result = pickFocus(candidates, windows, NOW);
    expect(result.taskId).toBe("fits");
  });

  test("when nothing fits, still picks the earliest-due candidate rather than nothing", () => {
    const windows: Window[] = [{ startMin: 0, endMin: 10 }]; // only 10 free minutes
    const candidates: FocusCandidate[] = [
      { _id: "sooner", estimateMin: 90, dueAt: NOW + DAY },
      { _id: "later", estimateMin: 90, dueAt: NOW + 2 * DAY },
    ];
    const result = pickFocus(candidates, windows, NOW);
    expect(result.taskId).toBe("sooner");
    expect(result.reason).toMatch(/may not fit/i);
  });

  test("an undated task never outranks a dated one", () => {
    const candidates: FocusCandidate[] = [
      { _id: "undated", estimateMin: 30 },
      { _id: "dated", estimateMin: 30, dueAt: NOW + DAY },
    ];
    const result = pickFocus(candidates, [{ startMin: 0, endMin: 120 }], NOW);
    expect(result.taskId).toBe("dated");
  });

  test("all-undated candidates still resolve to a pick, not null", () => {
    const candidates: FocusCandidate[] = [
      { _id: "a", estimateMin: 30 },
      { _id: "b", estimateMin: 30 },
    ];
    const result = pickFocus(candidates, [{ startMin: 0, endMin: 120 }], NOW);
    expect(result.taskId).not.toBeNull();
  });

  test("no free windows at all still resolves to the earliest-due candidate", () => {
    const candidates: FocusCandidate[] = [{ _id: "a", estimateMin: 30, dueAt: NOW + DAY }];
    const result = pickFocus(candidates, [], NOW);
    expect(result.taskId).toBe("a");
  });
});

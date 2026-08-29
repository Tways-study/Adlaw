import { describe, expect, test } from "vitest";
import { heuristicProvider } from "./heuristic";
import type { Task } from "../core/types";

const NOW = new Date("2026-08-29T09:00:00").getTime();

describe("HeuristicProvider", () => {
  test("parse wraps core/heuristic.ts's parseHeuristic", async () => {
    const result = await heuristicProvider.parse("BIO 210 essay due friday, 2h", { now: NOW });
    expect(result.courseCode).toBe("BIO 210");
    expect(result.estimateMin).toBe(120);
    expect(result.dueAt).toBeTypeOf("number");
    expect(result.shouldSplit).toBe(false);
  });

  test("parse never throws, even on empty or nonsense input", async () => {
    await expect(heuristicProvider.parse("", { now: NOW })).resolves.toBeDefined();
    await expect(heuristicProvider.parse("   ", { now: NOW })).resolves.toBeDefined();
  });

  test("breakdown adapts core/breakdown.ts and sums back to the task's estimate", async () => {
    const task: Task = {
      _id: "t1",
      title: "Bio lab report",
      rawText: "bio lab report 3h",
      estimateMin: 180,
      status: "shelf",
      laneOrder: 0,
      parseState: "ok",
      createdAt: NOW,
    };
    const { steps } = await heuristicProvider.breakdown(task);
    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(steps.reduce((sum, s) => sum + s.estimateMin, 0)).toBe(180);
  });

  test("focus adapts core/focus.ts and picks the earliest-due fitting task", async () => {
    const pick = await heuristicProvider.focus({
      queue: [
        { _id: "later", estimateMin: 30, dueAt: NOW + 2 * 86_400_000 },
        { _id: "sooner", estimateMin: 30, dueAt: NOW + 86_400_000 },
      ],
      windows: [{ startMin: 0, endMin: 120 }],
      now: NOW,
    });
    expect(pick.taskId).toBe("sooner");
    expect(pick.reason.length).toBeGreaterThan(0);
  });

  test("focus resolves to a null pick, not a throw, for an empty queue", async () => {
    const pick = await heuristicProvider.focus({ queue: [], windows: [], now: NOW });
    expect(pick.taskId).toBeNull();
  });
});

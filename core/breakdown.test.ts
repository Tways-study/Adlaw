import { describe, expect, test } from "vitest";
import { computeBreakdown } from "./breakdown";

const NOW = new Date("2026-08-29T09:00:00").getTime();
const sum = (steps: { estimateMin: number }[]) => steps.reduce((s, x) => s + x.estimateMin, 0);

describe("computeBreakdown", () => {
  test("a 180-minute task with no due date splits into 3 even, undated steps", () => {
    const steps = computeBreakdown("Bio lab report", 180, undefined, NOW);
    expect(steps).toHaveLength(3);
    expect(steps.every((s) => s.estimateMin === 60)).toBe(true);
    expect(steps.every((s) => s.dueAt === undefined)).toBe(true);
    expect(sum(steps)).toBe(180);
  });

  test("steps are ordered and titled with their position", () => {
    const steps = computeBreakdown("Bio lab report", 180, undefined, NOW);
    expect(steps.map((s) => s.title)).toEqual([
      "Bio lab report — step 1 of 3",
      "Bio lab report — step 2 of 3",
      "Bio lab report — step 3 of 3",
    ]);
  });

  test("a remainder that doesn't divide evenly still sums exactly, padding later steps", () => {
    const steps = computeBreakdown("Essay", 200, undefined, NOW);
    expect(steps).toHaveLength(3);
    expect(steps.map((s) => s.estimateMin)).toEqual([66, 67, 67]);
    expect(sum(steps)).toBe(200);
  });

  test("step count is clamped to a maximum of 6 for very large estimates", () => {
    const steps = computeBreakdown("Thesis chapter", 600, undefined, NOW);
    expect(steps).toHaveLength(6);
    expect(sum(steps)).toBe(600);
  });

  test("step count is clamped to a minimum of 2 for a deliberate on-demand split", () => {
    const steps = computeBreakdown("Quick reading", 45, undefined, NOW);
    expect(steps).toHaveLength(2);
    expect(sum(steps)).toBe(45);
  });

  test("a sub-2-minute task degrades to a single step rather than a zero-minute one", () => {
    const steps = computeBreakdown("Tiny task", 1, undefined, NOW);
    expect(steps).toHaveLength(1);
    expect(steps[0].estimateMin).toBe(1);
  });

  test("with a future due date, step due dates are paced backward and the last equals dueAt exactly", () => {
    const dueAt = NOW + 3 * 24 * 60 * 60 * 1000; // 3 days out
    const steps = computeBreakdown("Bio lab report", 180, dueAt, NOW);
    expect(steps[2].dueAt).toBe(dueAt);
    expect(steps[0].dueAt!).toBeLessThan(steps[1].dueAt!);
    expect(steps[1].dueAt!).toBeLessThan(steps[2].dueAt!);
    expect(steps[0].dueAt!).toBeGreaterThan(NOW);
  });

  test("an already-overdue due date paces every step to now, never before it", () => {
    const overdue = NOW - 60_000;
    const steps = computeBreakdown("Late thing", 180, overdue, NOW);
    expect(steps.every((s) => s.dueAt === NOW)).toBe(true);
  });

  test("a due date exactly at now paces every step to now", () => {
    const steps = computeBreakdown("Due right now", 120, NOW, NOW);
    expect(steps.every((s) => s.dueAt === NOW)).toBe(true);
  });

  test("never throws for an unusual estimate (0-ish, fractional)", () => {
    expect(() => computeBreakdown("x", 0.4, undefined, NOW)).not.toThrow();
    const steps = computeBreakdown("x", 0.4, undefined, NOW);
    expect(steps.length).toBeGreaterThan(0);
    expect(sum(steps)).toBeGreaterThan(0);
  });
});

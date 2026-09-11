// The landing page makes specific claims about what the parser does with a
// sentence, and prints specific durations next to each other. Both are easy to
// falsify by accident later — a tweak to `parseHeuristic`'s keyword table in
// Slice 7, or to `formatEstimate`'s padding, would silently make the marketing
// copy wrong with nothing failing.
//
// Pure Node, no jsdom: vitest.config.mts includes `**/*.test.ts` only and
// configures no environment, so this needs no config change.

import { describe, it, expect } from "vitest";
// Relative, not "@/" — the existing tests (core/heuristic.test.ts,
// core/order.test.ts) import this way, and staying consistent here matters
// more than the "@" alias vitest.config.mts added afterward for a different
// caller.
import { parseHeuristic } from "../../core/heuristic";
import { computeBreakdown } from "../../core/breakdown";
import { formatEstimate, formatDue } from "../board/format";
import {
  FIXED_NOW,
  DEMO_SENTENCES,
  CAPACITY_OVER,
  CAPACITY_FITS,
  FOCUS,
  BOARD_PREVIEW,
  previewCutIndex,
  type CapacityFixture,
} from "./copy";

// The hero's board preview sits directly above the capacity slot band, so
// the two must tell the same story about the same day.
describe("the board preview agrees with the capacity slot", () => {
  const { focus, queue } = BOARD_PREVIEW;

  it("focus plus queue sum to the planned minutes", () => {
    const total = focus.estimateMin + queue.reduce((sum, t) => sum + t.estimateMin, 0);
    expect(total).toBe(CAPACITY_OVER.plannedMin);
  });

  it("the focus card shows the same estimate as the focus demo", () => {
    expect(formatEstimate(focus.estimateMin)).toBe(FOCUS.estimate);
  });

  it("the cutline falls before the first task past the free minutes", () => {
    const cut = previewCutIndex(CAPACITY_OVER.freeMin);
    expect(cut).toBeGreaterThan(0);
    const before = focus.estimateMin + queue.slice(0, cut).reduce((s, t) => s + t.estimateMin, 0);
    expect(before).toBeLessThanOrEqual(CAPACITY_OVER.freeMin);
    expect(before + queue[cut].estimateMin).toBeGreaterThan(CAPACITY_OVER.freeMin);
  });

  it("everything fits when the free minutes cover the plan", () => {
    expect(previewCutIndex(CAPACITY_OVER.plannedMin)).toBe(-1);
  });
});

describe("demo sentences still parse the way the page claims", () => {
  for (const { raw, claim } of DEMO_SENTENCES) {
    it(`"${raw}"`, () => {
      const parsed = parseHeuristic(raw, FIXED_NOW);

      expect(parsed.title).toBe(claim.title);
      expect(parsed.courseCode).toBe(claim.courseCode);
      expect(formatEstimate(parsed.estimateMin)).toBe(claim.estimate);
      expect(parsed.shouldSplit).toBe(claim.shouldSplit);

      if (claim.due === undefined) {
        expect(parsed.dueAt).toBeUndefined();
      } else {
        expect(parsed.dueAt).toBeDefined();
        expect(formatDue(parsed.dueAt!, FIXED_NOW)).toBe(claim.due);
      }

      // HowItWorks.tsx renders this count from computeBreakdown itself, not
      // a literal — this pins the fixture's claim.stepCount to what that
      // real function produces, so an estimate edit here or a change to
      // computeBreakdown's target step size can't silently make the "how
      // it works" card claim a number the app wouldn't actually produce.
      if (claim.shouldSplit) {
        expect(claim.stepCount).toBeDefined();
        const steps = computeBreakdown(parsed.title, parsed.estimateMin, parsed.dueAt, FIXED_NOW);
        expect(steps.length).toBe(claim.stepCount);
      } else {
        expect(claim.stepCount).toBeUndefined();
      }
    });
  }
});

describe("capacity fixtures add up", () => {
  const cases: Array<[string, CapacityFixture]> = [
    ["over", CAPACITY_OVER],
    ["fits", CAPACITY_FITS],
  ];

  for (const [name, fixture] of cases) {
    describe(name, () => {
      it("renders each duration the way formatEstimate would", () => {
        expect(formatEstimate(fixture.freeMin)).toBe(fixture.free);
        expect(formatEstimate(fixture.plannedMin)).toBe(fixture.planned);
        expect(formatEstimate(fixture.deltaMin)).toBe(fixture.delta);
      });

      it("states a delta that is actually the difference", () => {
        expect(fixture.deltaMin).toBe(Math.abs(fixture.plannedMin - fixture.freeMin));
      });

      it("agrees with itself about whether the day is over capacity", () => {
        expect(fixture.over).toBe(fixture.plannedMin > fixture.freeMin);
      });
    });
  }
});

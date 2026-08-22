// The landing page makes specific claims about what the parser does with a
// sentence, and prints specific durations next to each other. Both are easy to
// falsify by accident later — a tweak to `parseHeuristic`'s keyword table in
// Slice 7, or to `formatEstimate`'s padding, would silently make the marketing
// copy wrong with nothing failing.
//
// Pure Node, no jsdom: vitest.config.mts includes `**/*.test.ts` only and
// configures no environment, so this needs no config change.

import { describe, it, expect } from "vitest";
// Relative, not "@/" — vitest.config.mts configures no path alias, and the
// existing tests (core/heuristic.test.ts, convex/tasks.test.ts) import this way.
import { parseHeuristic } from "../../core/heuristic";
import { formatEstimate, formatDue } from "../board/format";
import {
  FIXED_NOW,
  DEMO_SENTENCES,
  CAPACITY_OVER,
  CAPACITY_FITS,
  type CapacityFixture,
} from "./copy";

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

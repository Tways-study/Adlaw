import { describe, expect, it } from "vitest";
import { parseHeuristic } from "./heuristic";

// A fixed Wednesday, used as "now" for every date-relative test below.
const WEDNESDAY = new Date(2026, 7, 19, 9, 0, 0).getTime(); // 2026-08-19 is a Wednesday

function endOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

describe("parseHeuristic — estimate formats", () => {
  it("parses 'Nh Mm'", () => {
    expect(parseHeuristic("finish report 1h 30m", WEDNESDAY).estimateMin).toBe(90);
  });

  it("parses decimal hours", () => {
    expect(parseHeuristic("finish report 1.5h", WEDNESDAY).estimateMin).toBe(90);
  });

  it("parses bare minutes", () => {
    expect(parseHeuristic("email advisor 10m", WEDNESDAY).estimateMin).toBe(10);
  });

  it("falls back to a keyword estimate when no explicit duration is given", () => {
    expect(parseHeuristic("read chapter 9", WEDNESDAY).estimateMin).toBe(45);
    expect(parseHeuristic("write the essay", WEDNESDAY).estimateMin).toBe(90);
  });

  it("defaults to 30 minutes when nothing matches", () => {
    expect(parseHeuristic("call mom", WEDNESDAY).estimateMin).toBe(30);
  });

  it("always returns a positive estimate", () => {
    expect(parseHeuristic("", WEDNESDAY).estimateMin).toBeGreaterThan(0);
    expect(parseHeuristic("   ", WEDNESDAY).estimateMin).toBeGreaterThan(0);
  });
});

describe("parseHeuristic — due dates", () => {
  it("resolves 'today' to the end of the current local day", () => {
    const result = parseHeuristic("renew library books today", WEDNESDAY);
    expect(result.dueAt).toBe(endOfDay(new Date(WEDNESDAY)));
  });

  it("resolves 'tomorrow' to the next day", () => {
    const result = parseHeuristic("renew library books tomorrow", WEDNESDAY);
    const tomorrow = new Date(WEDNESDAY);
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(result.dueAt).toBe(endOfDay(tomorrow));
  });

  it("resolves a weekday name to its next occurrence", () => {
    // WEDNESDAY is a Wednesday; "Friday" should land 2 days later, same week.
    const result = parseHeuristic("finish lab report due friday", WEDNESDAY);
    const friday = new Date(WEDNESDAY);
    friday.setDate(friday.getDate() + 2);
    expect(result.dueAt).toBe(endOfDay(friday));
  });

  it("wraps to next week when the named weekday has already passed this week", () => {
    // WEDNESDAY is a Wednesday; "Monday" should land 5 days later, next week —
    // this is the week-boundary case.
    const result = parseHeuristic("essay outline due monday", WEDNESDAY);
    const monday = new Date(WEDNESDAY);
    monday.setDate(monday.getDate() + 5);
    expect(result.dueAt).toBe(endOfDay(monday));
  });

  it("resolves 'in N days'", () => {
    const result = parseHeuristic("midterm in 9 days", WEDNESDAY);
    const inNine = new Date(WEDNESDAY);
    inNine.setDate(inNine.getDate() + 9);
    expect(result.dueAt).toBe(endOfDay(inNine));
  });

  it("leaves dueAt undefined when nothing matches", () => {
    expect(parseHeuristic("call mom", WEDNESDAY).dueAt).toBeUndefined();
  });
});

describe("parseHeuristic — course codes", () => {
  it("extracts a course code like 'BIO 210'", () => {
    expect(parseHeuristic("BIO 210 lab report", WEDNESDAY).courseCode).toBe("BIO 210");
  });

  it("normalizes casing and spacing", () => {
    expect(parseHeuristic("finish calc2 pset", WEDNESDAY).courseCode).toBe("CALC 2");
  });

  it("does not false-positive on 'in 9 days' or 'wk 7'", () => {
    expect(parseHeuristic("midterm in 9 days", WEDNESDAY).courseCode).toBeUndefined();
    expect(parseHeuristic("reading wk 7", WEDNESDAY).courseCode).toBeUndefined();
  });
});

describe("parseHeuristic — title", () => {
  it("falls back to the raw text when nothing is left after extraction", () => {
    const result = parseHeuristic("BIO 210", WEDNESDAY);
    expect(result.title).toBe("BIO 210");
  });

  it("strips leading filler words and capitalizes", () => {
    const result = parseHeuristic("email advisor about spring registration", WEDNESDAY);
    expect(result.title.startsWith("Email")).toBe(true);
  });

  it("never returns an empty title", () => {
    expect(parseHeuristic("BIO 210 1h 30m due friday", WEDNESDAY).title.length).toBeGreaterThan(0);
  });
});

describe("parseHeuristic — shouldSplit", () => {
  it("flags large estimates for breakdown", () => {
    expect(parseHeuristic("write thesis chapter 4h", WEDNESDAY).shouldSplit).toBe(true);
  });

  it("does not flag small estimates", () => {
    expect(parseHeuristic("email advisor 10m", WEDNESDAY).shouldSplit).toBe(false);
  });
});

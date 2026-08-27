import { describe, expect, test } from "vitest";
import { computeLaneOrder } from "./order";

describe("computeLaneOrder", () => {
  test("append into an empty lane places the task at 0", () => {
    expect(computeLaneOrder(null, null, null)).toBe(0);
  });
  test("append into a non-empty lane places the task 1024 after the last", () => {
    expect(computeLaneOrder(null, null, 500)).toBe(1524);
  });
  test("prepend (after only) places the task 1024 before its neighbor", () => {
    expect(computeLaneOrder(null, 500, 9999)).toBe(-524);
  });
  test("insert-between (before and after) places the task at the midpoint", () => {
    expect(computeLaneOrder(0, 1024, 9999)).toBe(512);
  });
  test("a before-only neighbor (no valid after) degrades to append, not insert-after", () => {
    expect(computeLaneOrder(500, null, 500)).toBe(1524);
  });
});

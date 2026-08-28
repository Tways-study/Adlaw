import { describe, expect, it } from "vitest";
import { layout } from "./capacity";
import type { Window } from "./time";
import type { Task } from "./types";

function task(overrides: Partial<Task>): Task {
  return {
    _id: "t",
    title: "task",
    rawText: "task",
    estimateMin: 30,
    status: "next",
    laneOrder: 0,
    parseState: "ok",
    createdAt: 0,
    ...overrides,
  };
}

describe("layout", () => {
  it("returns zero everything for an empty queue", () => {
    const windows: Window[] = [{ startMin: 600, endMin: 700 }];
    const result = layout([], windows, 600);
    expect(result).toEqual({ freeMin: 100, plannedMin: 0, overageMin: 0, cutIndex: null, blocks: [] });
  });

  it("packs an exact fit at a window boundary and moves the next task to the next window", () => {
    const windows: Window[] = [
      { startMin: 600, endMin: 660 },
      { startMin: 700, endMin: 760 },
    ];
    const queue = [task({ _id: "a", estimateMin: 60 }), task({ _id: "b", estimateMin: 30 })];
    const result = layout(queue, windows, 600);
    expect(result.blocks).toEqual([
      { taskId: "a", startMin: 600, endMin: 660, spill: false },
      { taskId: "b", startMin: 700, endMin: 730, spill: false },
    ]);
    expect(result.cutIndex).toBeNull();
  });

  it("flags spill exactly one minute over the last window with no next window", () => {
    const windows: Window[] = [{ startMin: 600, endMin: 660 }];
    const queue = [task({ _id: "a", estimateMin: 61 })];
    const result = layout(queue, windows, 600);
    expect(result.blocks).toEqual([{ taskId: "a", startMin: 600, endMin: 661, spill: true }]);
    expect(result.cutIndex).toBe(0);
    expect(result.overageMin).toBe(1);
  });

  it("moves a task whole to the next window when it spans a window boundary", () => {
    const windows: Window[] = [
      { startMin: 600, endMin: 660 },
      { startMin: 700, endMin: 800 },
    ];
    const queue = [task({ _id: "a", estimateMin: 50 }), task({ _id: "b", estimateMin: 30 })];
    const result = layout(queue, windows, 600);
    // "a" leaves [650,660] unused; "b" moves whole to window 2's start.
    expect(result.blocks[0]).toEqual({ taskId: "a", startMin: 600, endMin: 650, spill: false });
    expect(result.blocks[1]).toEqual({ taskId: "b", startMin: 700, endMin: 730, spill: false });
  });

  it("places every task as spill, sequentially from nowMin, when there are zero windows", () => {
    const queue = [task({ _id: "a", estimateMin: 30 }), task({ _id: "b", estimateMin: 45 })];
    const result = layout(queue, [], 600);
    expect(result.freeMin).toBe(0);
    expect(result.blocks).toEqual([
      { taskId: "a", startMin: 600, endMin: 630, spill: true },
      { taskId: "b", startMin: 630, endMin: 675, spill: true },
    ]);
    expect(result.cutIndex).toBe(0);
    expect(result.overageMin).toBe(75);
  });

  it("moves cutIndex later when an earlier oversized task is removed from the queue", () => {
    const windows: Window[] = [{ startMin: 600, endMin: 690 }]; // 90 min
    const withOverflow = [
      task({ _id: "a", estimateMin: 60 }),
      task({ _id: "b", estimateMin: 60 }),
      task({ _id: "c", estimateMin: 10 }),
    ];
    const first = layout(withOverflow, windows, 600);
    expect(first.cutIndex).toBe(1); // "b" is the first to spill

    const withoutA = [task({ _id: "b", estimateMin: 60 }), task({ _id: "c", estimateMin: 10 })];
    const second = layout(withoutA, windows, 600);
    expect(second.cutIndex).toBeNull(); // 60 + 10 = 70 <= 90, everything fits now
  });

  it("flags every task from the first spill onward, stacking sequentially past the edge", () => {
    const windows: Window[] = [{ startMin: 600, endMin: 630 }]; // 30 min
    const queue = [
      task({ _id: "a", estimateMin: 30 }), // exact fit
      task({ _id: "b", estimateMin: 20 }), // spill #1, at cursor (630)
      task({ _id: "c", estimateMin: 10 }), // spill #2, stacks after b
    ];
    const result = layout(queue, windows, 600);
    expect(result.blocks).toEqual([
      { taskId: "a", startMin: 600, endMin: 630, spill: false },
      { taskId: "b", startMin: 630, endMin: 650, spill: true },
      { taskId: "c", startMin: 650, endMin: 660, spill: true },
    ]);
    expect(result.cutIndex).toBe(1);
  });

  it("reports overage whenever anything spills, even when planned equals free", () => {
    // The regression this guards: packing strands the last 15 minutes of the
    // first window (45 can't fit there), so a queue whose total exactly
    // equals freeMin still runs past the edge. `plannedMin - freeMin` would
    // be 0 here and the capacity slot would read "fits exactly" while the
    // cutline and the timeline both showed the day running out.
    const windows: Window[] = [
      { startMin: 600, endMin: 660 },
      { startMin: 700, endMin: 760 },
    ];
    const queue = [
      task({ _id: "a", estimateMin: 45 }),
      task({ _id: "b", estimateMin: 45 }),
      task({ _id: "c", estimateMin: 30 }),
    ];
    const result = layout(queue, windows, 600);

    expect(result.freeMin).toBe(120);
    expect(result.plannedMin).toBe(120);
    expect(result.cutIndex).toBe(2);
    expect(result.overageMin).toBe(15); // 775 (plan end) − 760 (last window end)
  });

  it("keeps overageMin > 0 and cutIndex !== null in lockstep", () => {
    const windows: Window[] = [
      { startMin: 600, endMin: 660 },
      { startMin: 700, endMin: 760 },
    ];
    // Walk a queue that grows one task at a time; the two signals must
    // agree at every step, since three separate surfaces render from them.
    const durations = [20, 30, 45, 25, 40, 15, 90];
    for (let n = 1; n <= durations.length; n++) {
      const queue = durations
        .slice(0, n)
        .map((estimateMin, i) => task({ _id: `t${i}`, estimateMin }));
      const { overageMin, cutIndex } = layout(queue, windows, 600);
      expect(overageMin > 0).toBe(cutIndex !== null);
    }
  });
});

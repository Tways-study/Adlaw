import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

function asUser() {
  const t = convexTest(schema, modules);
  return t.withIdentity({ subject: "test-user" });
}

async function seedTask(t: ReturnType<typeof asUser>, title: string) {
  return t.mutation(api.tasks.create, {
    rawText: title,
    title,
    estimateMin: 30,
    parseState: "fallback",
  });
}

describe("tasks.move — one-now invariant", () => {
  test("promoting a task to now demotes the prior now task to next", async () => {
    const t = asUser();
    const first = await seedTask(t, "first");
    const second = await seedTask(t, "second");

    await t.mutation(api.tasks.move, { id: first, status: "now" });
    await t.mutation(api.tasks.move, { id: second, status: "now" });

    const nowTasks = await t.query(api.tasks.listByStatus, { status: "now" });
    const nextTasks = await t.query(api.tasks.listByStatus, { status: "next" });

    expect(nowTasks.map((task) => task._id)).toEqual([second]);
    expect(nextTasks.map((task) => task._id)).toContain(first);
  });

  test("moving the current now task to now again is a no-op, not a self-demotion", async () => {
    const t = asUser();
    const only = await seedTask(t, "only");
    await t.mutation(api.tasks.move, { id: only, status: "now" });
    await t.mutation(api.tasks.move, { id: only, status: "now" });

    const nowTasks = await t.query(api.tasks.listByStatus, { status: "now" });
    expect(nowTasks.map((task) => task._id)).toEqual([only]);
  });
});

describe("tasks.move — laneOrder math", () => {
  test("append (no neighbors) places the task after the current last", async () => {
    const t = asUser();
    const a = await seedTask(t, "a");
    const b = await seedTask(t, "b");
    await t.mutation(api.tasks.move, { id: a, status: "next" });
    await t.mutation(api.tasks.move, { id: b, status: "next" });

    const next = await t.query(api.tasks.listByStatus, { status: "next" });
    expect(next.map((task) => task._id)).toEqual([a, b]);
  });

  test("prepend (afterId only) places the task before its neighbor", async () => {
    const t = asUser();
    const a = await seedTask(t, "a");
    const b = await seedTask(t, "b");
    await t.mutation(api.tasks.move, { id: a, status: "next" });
    await t.mutation(api.tasks.move, { id: b, status: "next", afterId: a });

    const next = await t.query(api.tasks.listByStatus, { status: "next" });
    expect(next.map((task) => task._id)).toEqual([b, a]);
  });

  test("insert-between (beforeId and afterId) places the task at the midpoint", async () => {
    const t = asUser();
    const a = await seedTask(t, "a");
    const b = await seedTask(t, "b");
    const c = await seedTask(t, "c");
    await t.mutation(api.tasks.move, { id: a, status: "next" });
    await t.mutation(api.tasks.move, { id: b, status: "next" });
    await t.mutation(api.tasks.move, { id: c, status: "next", beforeId: a, afterId: b });

    const next = await t.query(api.tasks.listByStatus, { status: "next" });
    expect(next.map((task) => task._id)).toEqual([a, c, b]);
  });

  test("a stale neighbor id (already moved elsewhere) degrades to append instead of throwing", async () => {
    const t = asUser();
    const a = await seedTask(t, "a");
    const b = await seedTask(t, "b");
    const stale = await seedTask(t, "stale");
    await t.mutation(api.tasks.move, { id: a, status: "next" });
    await t.mutation(api.tasks.move, { id: b, status: "next" });
    // stale never joins "next" — its id is passed as a neighbor anyway.
    await expect(
      t.mutation(api.tasks.move, { id: stale, status: "next", afterId: stale }),
    ).resolves.toBeNull();

    const next = await t.query(api.tasks.listByStatus, { status: "next" });
    expect(next.at(-1)?._id).toBe(stale);
  });
});

describe("tasks.move — done exclusion", () => {
  test("moving a done task is a no-op", async () => {
    const t = asUser();
    const id = await seedTask(t, "finished");
    await t.mutation(api.tasks.complete, { id });

    await t.mutation(api.tasks.move, { id, status: "next" });

    const doneStillThere = await t.query(api.tasks.listDoneToday, { startOfDayMs: 0 });
    expect(doneStillThere.map((task) => task._id)).toContain(id);
    const next = await t.query(api.tasks.listByStatus, { status: "next" });
    expect(next.map((task) => task._id)).not.toContain(id);
  });
});

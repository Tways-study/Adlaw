import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not signed in");
  return userId;
}

const laneStatus = v.union(v.literal("shelf"), v.literal("next"), v.literal("now"), v.literal("done"));
// "done" is deliberately excluded — movement never targets it, only
// complete/uncomplete do (see CLAUDE.md "Done filtering").
const movableStatus = v.union(v.literal("shelf"), v.literal("next"), v.literal("now"));
type MovableStatus = "shelf" | "next" | "now";
const parseStateValidator = v.union(v.literal("ok"), v.literal("fallback"), v.literal("failed"));

const taskDoc = v.object({
  _id: v.id("tasks"),
  _creationTime: v.number(),
  userId: v.id("users"),
  title: v.string(),
  rawText: v.string(),
  courseId: v.optional(v.id("courses")),
  estimateMin: v.number(),
  dueAt: v.optional(v.number()),
  status: laneStatus,
  laneOrder: v.number(),
  parentId: v.optional(v.id("tasks")),
  stepIndex: v.optional(v.number()),
  parseState: parseStateValidator,
  excludedFromFocusUntil: v.optional(v.number()),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
});

const courseDoc = v.object({
  _id: v.id("courses"),
  _creationTime: v.number(),
  userId: v.id("users"),
  code: v.string(),
  name: v.optional(v.string()),
  active: v.boolean(),
});

async function nextLaneOrder(
  ctx: MutationCtx,
  userId: Id<"users">,
  status: "shelf" | "next" | "now" | "done",
): Promise<number> {
  const last = await ctx.db
    .query("tasks")
    .withIndex("by_user_status_order", (q) => q.eq("userId", userId).eq("status", status))
    .order("desc")
    .first();
  return last ? last.laneOrder + 1024 : 0;
}

async function resolveDropLaneOrder(
  ctx: MutationCtx,
  userId: Id<"users">,
  status: MovableStatus,
  beforeId: Id<"tasks"> | undefined,
  afterId: Id<"tasks"> | undefined,
): Promise<number> {
  // Re-derive from fresh reads rather than trusting client-supplied
  // neighbors — a neighbor may have moved between drag-start and drop.
  const before = beforeId ? await ctx.db.get(beforeId) : null;
  const after = afterId ? await ctx.db.get(afterId) : null;
  const beforeValid = before && before.userId === userId && before.status === status ? before : null;
  const afterValid = after && after.userId === userId && after.status === status ? after : null;

  if (beforeValid && afterValid) {
    return (beforeValid.laneOrder + afterValid.laneOrder) / 2;
  }
  if (afterValid) {
    return afterValid.laneOrder - 1024;
  }
  // Neither, or only a (possibly stale) beforeId: append to the end.
  return nextLaneOrder(ctx, userId, status);
}

async function resolveCourseId(
  ctx: MutationCtx,
  userId: Id<"users">,
  courseCode: string | undefined,
): Promise<Id<"courses"> | undefined> {
  if (!courseCode) return undefined;
  const normalized = courseCode.trim();
  if (normalized.length === 0) return undefined;

  // Per-user course list; it realistically stays in the dozens, so a
  // generous bound here is effectively unbounded in practice while still
  // giving the query a hard ceiling.
  const existing = await ctx.db
    .query("courses")
    .withIndex("by_user_active", (q) => q.eq("userId", userId))
    .take(500);
  const match = existing.find((c) => c.code.toLowerCase() === normalized.toLowerCase());
  if (match) return match._id;

  return ctx.db.insert("courses", { userId, code: normalized, active: true });
}

export const listByStatus = query({
  args: { status: laneStatus },
  returns: v.array(taskDoc),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_status_order", (q) => q.eq("userId", userId).eq("status", args.status))
      .order("asc")
      .collect();
    return tasks.filter((t) => t.parentId === undefined);
  },
});

export const listDoneToday = query({
  args: { startOfDayMs: v.number() },
  returns: v.array(taskDoc),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_completed", (q) => q.eq("userId", userId).gte("completedAt", args.startOfDayMs))
      .order("desc")
      .collect();
    return tasks.filter((t) => t.parentId === undefined && t.status === "done");
  },
});

export const listCourses = query({
  args: {},
  returns: v.array(courseDoc),
  handler: async (ctx): Promise<Doc<"courses">[]> => {
    const userId = await requireUserId(ctx);
    return ctx.db
      .query("courses")
      .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("active", true))
      .collect();
  },
});

export const create = mutation({
  args: {
    rawText: v.string(),
    title: v.string(),
    courseCode: v.optional(v.string()),
    estimateMin: v.number(),
    dueAt: v.optional(v.number()),
    parseState: parseStateValidator,
  },
  returns: v.id("tasks"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const estimateMin = args.estimateMin > 0 ? args.estimateMin : 30;
    const courseId = await resolveCourseId(ctx, userId, args.courseCode);
    const laneOrder = await nextLaneOrder(ctx, userId, "shelf");

    return ctx.db.insert("tasks", {
      userId,
      title: args.title,
      rawText: args.rawText,
      courseId,
      estimateMin,
      dueAt: args.dueAt,
      status: "shelf",
      laneOrder,
      parseState: args.parseState,
      createdAt: Date.now(),
    });
  },
});

export const complete = mutation({
  args: { id: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const task = await ctx.db.get(args.id);
    if (task && task.userId === userId && task.status !== "done") {
      await ctx.db.patch(args.id, { status: "done", completedAt: Date.now() });
    }
    return null;
  },
});

export const uncomplete = mutation({
  args: { id: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const task = await ctx.db.get(args.id);
    if (task && task.userId === userId && task.status === "done") {
      const laneOrder = await nextLaneOrder(ctx, userId, "next");
      await ctx.db.patch(args.id, { status: "next", laneOrder, completedAt: undefined });
    }
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const task = await ctx.db.get(args.id);
    if (task && task.userId === userId) {
      await ctx.db.delete(args.id);
    }
    return null;
  },
});

export const move = mutation({
  args: {
    id: v.id("tasks"),
    status: movableStatus,
    beforeId: v.optional(v.id("tasks")),
    afterId: v.optional(v.id("tasks")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const task = await ctx.db.get(args.id);
    if (!task || task.userId !== userId || task.status === "done") return null;

    // Enforce the one-"now" invariant before computing the moved task's own
    // laneOrder, so a same-lane append below never sees the stale incumbent.
    if (args.status === "now") {
      const incumbent = await ctx.db
        .query("tasks")
        .withIndex("by_user_status_order", (q) => q.eq("userId", userId).eq("status", "now"))
        .first();
      if (incumbent && incumbent._id !== args.id) {
        await ctx.db.patch(incumbent._id, {
          status: "next",
          laneOrder: await nextLaneOrder(ctx, userId, "next"),
        });
      }
    }

    const laneOrder = await resolveDropLaneOrder(ctx, userId, args.status, args.beforeId, args.afterId);
    await ctx.db.patch(args.id, { status: args.status, laneOrder });
    return null;
  },
});

export const restore = mutation({
  args: {
    rawText: v.string(),
    title: v.string(),
    courseId: v.optional(v.id("courses")),
    estimateMin: v.number(),
    dueAt: v.optional(v.number()),
    status: laneStatus,
    laneOrder: v.number(),
    parseState: parseStateValidator,
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  },
  returns: v.id("tasks"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return ctx.db.insert("tasks", { ...args, userId });
  },
});

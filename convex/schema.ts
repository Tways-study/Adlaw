import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  courses: defineTable({
    userId: v.id("users"),
    code: v.string(), // "BIO 210" — shown on cards
    name: v.optional(v.string()), // "Intro to Cell Biology"
    active: v.boolean(),
  }).index("by_user_active", ["userId", "active"]),

  tasks: defineTable({
    userId: v.id("users"),
    title: v.string(), // cleaned, display
    rawText: v.string(), // exactly what was typed — never overwritten
    courseId: v.optional(v.id("courses")),
    estimateMin: v.number(), // > 0, enforced in the mutation
    dueAt: v.optional(v.number()), // epoch ms
    status: v.union(
      // see lifecycle, 02-app-flow / CONTEXT.md
      v.literal("shelf"),
      v.literal("next"),
      v.literal("now"),
      v.literal("done"),
    ),
    laneOrder: v.number(), // sparse float, see Ordering
    parentId: v.optional(v.id("tasks")),
    stepIndex: v.optional(v.number()),
    parseState: v.union(v.literal("ok"), v.literal("fallback"), v.literal("failed")),
    excludedFromFocusUntil: v.optional(v.number()), // "Not this one"
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user_status_order", ["userId", "status", "laneOrder"])
    .index("by_user_due", ["userId", "dueAt"])
    .index("by_parent", ["parentId", "stepIndex"])
    .index("by_user_completed", ["userId", "completedAt"]),

  scheduleBlocks: defineTable({
    userId: v.id("users"),
    weekday: v.number(), // 0 = Sunday … 6
    startMin: v.number(), // minutes past local midnight
    endMin: v.number(),
    label: v.string(), // "BIO 210 lecture"
    kind: v.union(v.literal("class"), v.literal("work"), v.literal("commute"), v.literal("other")),
    activeFrom: v.number(), // epoch ms
    activeTo: v.optional(v.number()), // null = current
  }).index("by_user_weekday", ["userId", "weekday"]),

  calendarCache: defineTable({
    userId: v.id("users"),
    gcalId: v.string(),
    startsAt: v.number(), // epoch ms
    endsAt: v.number(),
    title: v.string(),
    fetchedAt: v.number(),
  })
    .index("by_user_gcal_id", ["userId", "gcalId"])
    .index("by_user_range", ["userId", "startsAt", "endsAt"]),
  // pure cache — replaced wholesale on every sync, safe to clear entirely

  aiLog: defineTable({
    userId: v.id("users"),
    kind: v.union(v.literal("parse"), v.literal("breakdown"), v.literal("focus")),
    input: v.string(),
    output: v.optional(v.string()), // raw model text, pre-validation
    provider: v.string(), // "gemini" | "heuristic"
    model: v.string(),
    ok: v.boolean(),
    error: v.optional(v.string()),
    latencyMs: v.number(),
    createdAt: v.number(),
  }).index("by_user_created", ["userId", "createdAt"]),

  settings: defineTable({
    // one row per user, not a global singleton
    userId: v.id("users"),
    theme: v.union(v.literal("light"), v.literal("dark"), v.literal("auto")),
    aiProvider: v.string(),
    aiModel: v.string(),
    googleRefreshTokenEncrypted: v.optional(v.string()),
    googleConnectedAt: v.optional(v.number()),
    googleLastSyncedAt: v.optional(v.number()),
    googleSyncStatus: v.optional(v.string()), // "ok" | "expired" | "error"
  }).index("by_user", ["userId"]),
});

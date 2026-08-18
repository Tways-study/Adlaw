> **Project:** Ledger · **Doc:** Backend Schema · **Version:** 3.0 · **Date:** 2026-08-17
> **Status:** Draft — reverted to Convex; see `00-stack-decision.md` v3.0
> **Upstream:** `01-prd.md`, `02-app-flow.md`, `00-stack-decision.md`

# Backend schema

Convex. Schema is TypeScript, so there is no SQL, no migration step, and no DDL
file. Six tables plus one singleton settings row — the same shape as the
Postgres version this replaces, carried over with full v1 scope (Calendar cache,
Google token storage) rather than the smaller, Calendar-deferred set from the
original Convex draft.

## Design rules

- **Derived data is never stored.** Free windows, capacity, overage, cutline
  position, and the Today's-shape layout are computed on read from
  `scheduleBlocks` + `tasks` + `calendarCache`. Storing them creates two sources
  of truth and one of them is always stale.
- **One user.** Convex Auth's `users` table holds exactly one account, seeded
  during setup, not created through a signup flow. No other table references it
  — every query and mutation checks `ctx.auth.getUserIdentity()` directly rather
  than joining against a user id.
- **Times are minutes past local midnight** (`0`–`1439`) for recurring schedule
  blocks, and epoch ms for anything dated. Recurring blocks must not be
  timestamps — a class at 09:00 is at 09:00 across a DST boundary.

## Tables

```ts
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  courses: defineTable({
    code: v.string(),                 // "BIO 210" — shown on cards
    name: v.optional(v.string()),     // "Intro to Cell Biology"
    active: v.boolean(),
  }).index("by_active", ["active"]),

  tasks: defineTable({
    title: v.string(),                // cleaned, display
    rawText: v.string(),              // exactly what was typed — never overwritten
    courseId: v.optional(v.id("courses")),
    estimateMin: v.number(),          // > 0, enforced in the mutation
    dueAt: v.optional(v.number()),    // epoch ms
    status: v.union(                  // see lifecycle, 02-app-flow
      v.literal("shelf"), v.literal("next"),
      v.literal("now"),   v.literal("done")),
    laneOrder: v.number(),            // sparse float, see Ordering
    parentId: v.optional(v.id("tasks")),
    stepIndex: v.optional(v.number()),
    parseState: v.union(
      v.literal("ok"), v.literal("fallback"), v.literal("failed")),
    excludedFromFocusUntil: v.optional(v.number()),  // "Not this one"
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_status_order", ["status", "laneOrder"])
    .index("by_due", ["dueAt"])
    .index("by_parent", ["parentId", "stepIndex"])
    .index("by_completed", ["completedAt"]),

  scheduleBlocks: defineTable({
    weekday: v.number(),              // 0 = Sunday … 6
    startMin: v.number(),             // minutes past local midnight
    endMin: v.number(),
    label: v.string(),                // "BIO 210 lecture"
    kind: v.union(v.literal("class"), v.literal("work"),
                  v.literal("commute"), v.literal("other")),
    activeFrom: v.number(),           // epoch ms
    activeTo: v.optional(v.number()), // null = current
  }).index("by_weekday", ["weekday"]),

  calendarCache: defineTable({
    gcalId: v.string(),
    startsAt: v.number(),             // epoch ms
    endsAt: v.number(),
    title: v.string(),
    fetchedAt: v.number(),
  }).index("by_gcal_id", ["gcalId"])
    .index("by_range", ["startsAt", "endsAt"]),
  // pure cache — replaced wholesale on every sync, safe to clear entirely

  aiLog: defineTable({
    kind: v.union(v.literal("parse"), v.literal("breakdown"),
                  v.literal("focus")),
    input: v.string(),
    output: v.optional(v.string()),   // raw model text, pre-validation
    provider: v.string(),             // "gemini" | "heuristic"
    model: v.string(),
    ok: v.boolean(),
    error: v.optional(v.string()),
    latencyMs: v.number(),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),

  settings: defineTable({             // exactly one row
    theme: v.union(v.literal("light"), v.literal("dark"), v.literal("auto")),
    aiProvider: v.string(),
    aiModel: v.string(),
    googleRefreshTokenEncrypted: v.optional(v.string()),
    googleConnectedAt: v.optional(v.number()),
    googleLastSyncedAt: v.optional(v.number()),
    googleSyncStatus: v.optional(v.string()),   // "ok" | "expired" | "error"
  }),
});
```

## Why each table exists

| Table | Read by | Written by | Notes |
|---|---|---|---|
| `courses` | S2 rail grouping, card labels | Parse (auto-creates on first sighting), S5, S6 course mgmt | Text label only. **No colour column** — course identity is never carried by hue |
| `tasks` | Every region of S2, S5 | Capture, drag, keyboard move, complete, breakdown, edit | The centre of the system |
| `scheduleBlocks` | Capacity engine, Today's shape, S4 | S4 only | Entered once per semester. Half of the v1 time model |
| `calendarCache` | Capacity engine, Today's shape | Calendar sync only (S7 "Sync now" or a Convex action on focus) | The other half. Pure cache — if empty or stale, capacity falls back to the manual schedule alone, silently |
| `aiLog` | S6 review list, manual quality review | Every AI call | **The only honest measure of whether the core promise works.** Without it, parse quality is a guess |
| `settings` | S6, theme boot, Calendar status everywhere | S6, the OAuth callback, sync | Singleton. Holds the one encrypted refresh token — this app's only secret-shaped piece of user data |

## Ordering within a lane

`laneOrder` is a **sparse float**. Inserting between two cards sets
`(prev + next) / 2`; inserting at either end offsets by ±1024. This makes a
reorder a single-document write instead of renumbering the lane, which matters
because reorder fires on every drop.

Floats degrade after very many insertions between the same pair. At ~40 tasks
this will not be reached; if it ever is, renormalise the lane to integers on read.

## Invariants

Enforced in mutations, not in the schema, because Convex validators can't
express cross-document rules:

1. **At most one task has `status: "now"`.** Promoting a second demotes the
   incumbent to `next` in the same transaction.
2. **A task with `parentId` set is a step**; its parent is never schedulable and
   never appears in a lane. Only steps carry a meaningful `laneOrder`.
3. **`completedAt` is set if and only if `status === "done"`.**
4. **`rawText` is immutable after creation.** Editing (M14) changes `title`
   only — this is what makes `aiLog` comparison meaningful later.
5. **`estimateMin > 0`.** A zero-effort task breaks the capacity engine's
   premise.

## Auth

Convex Auth, password provider, one account seeded during setup — no public
signup route exists. Every query and mutation opens with:

```ts
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not signed in");
```

This is the entire authorization model, and it's a real identity check rather
than a hand-rolled cookie, because Convex functions are called directly from the
React client for live queries — there's no server-only boundary to hide behind
the way there was with a Postgres service-role key. With one user there's still
no ownership to check and no policy set to write beyond "is anyone signed in."

## Calendar OAuth

A **Convex HTTP action** at a `*.convex.site` URL serves as the OAuth redirect
target directly — no Next.js API route in between. It exchanges the code,
encrypts the refresh token (e.g. `AES-256-GCM` with a Convex environment-variable
key), and writes it to `settings`. A separate Convex action, triggered by "Sync
now" or focus-revalidation, decrypts the token, refreshes it, fetches events for
`[today, today+14d]`, and replaces `calendarCache` wholesale — simplest possible
correctness model for a cache this small.

## Retention

- `tasks` — kept indefinitely. `done` tasks leave the Done lane after their day
  via the `by_completed` index, not by deletion.
- `calendarCache` — replaced wholesale on every sync. Never accumulates.
- `aiLog` — kept indefinitely at this volume. If it ever grows, trim by
  `by_created`; nothing depends on it.
- Export-all-data (S6) serialises every table to JSON, excluding the encrypted
  Google token. There is no import in v1.

> **Project:** Adlaw · **Doc:** Backend Schema · **Version:** 4.0 · **Date:** 2026-08-26
> **Status:** Draft — moved to Firebase/Firestore; see `00-stack-decision.md` v4.0
> **Upstream:** `01-prd.md`, `02-app-flow.md`, `00-stack-decision.md`

# Backend schema

Firestore. Documents are schemaless at the database level, so `firestore.rules`
carries the field-validation role a Convex `v.object()` validator (or a SQL DDL
file) would have — see §Invariants. Six subcollections plus one fixed-id
settings document, nested under `users/{uid}/…` rather than carrying a
`userId` field — the path *is* the ownership, not a column checked in handler
code.

## Design rules

- **Derived data is never stored.** Free windows, capacity, overage, cutline
  position, and the Today's-shape layout are computed on read from
  `scheduleBlocks` + `tasks` + `calendarCache`. Storing them creates two sources
  of truth and one of them is always stale.
- **Multi-user, open signup.** Firebase Auth holds one account per signed-up
  user (Google or email/password, `00-intake.md` Amendment 4 — the invite gate
  from Amendment 3 is dropped). Every user's data lives under `users/{uid}/…`;
  there is no cross-user read path to close off because none exists — a query
  against another `uid`'s subcollection is rejected by `firestore.rules` before
  it reaches any data, not filtered out of a result set.
- **Times are minutes past local midnight** (`0`–`1439`) for recurring schedule
  blocks, and epoch ms for anything dated. Recurring blocks must not be
  timestamps — a class at 09:00 is at 09:00 across a DST boundary.

## Tables

```text
users/{uid}                     — Firebase Auth manages this identity; no
                                   app-owned document required at this path
  tasks/{taskId}
    title: string                // cleaned, display
    rawText: string              // exactly what was typed — never overwritten
    courseId?: string
    estimateMin: number          // > 0, enforced in firestore.rules
    dueAt?: number                // epoch ms
    status: "shelf" | "next" | "now" | "done"
    laneOrder: number             // sparse float, see Ordering
    parentId?: string
    stepIndex?: number
    parseState: "ok" | "fallback" | "failed"
    excludedFromFocusUntil?: number  // "Not this one"
    createdAt: number
    completedAt?: number

  courses/{courseId}
    code: string                  // "BIO 210" — shown on cards
    name?: string                 // "Intro to Cell Biology"
    active: boolean

  scheduleBlocks/{blockId}        // Slice 4, not built
    weekday: number                // 0 = Sunday … 6
    startMin: number               // minutes past local midnight
    endMin: number
    label: string                  // "BIO 210 lecture"
    kind: "class" | "work" | "commute" | "other"
    activeFrom: number             // epoch ms
    activeTo?: number              // absent = current

  calendarCache/{eventId}         // Slice 6, not built — pure cache,
                                    replaced wholesale on every sync
    gcalId: string
    startsAt: number               // epoch ms
    endsAt: number
    title: string
    fetchedAt: number

  aiLog/{logId}                   // Slice 7, not built
    kind: "parse" | "breakdown" | "focus"
    input: string
    output?: string                // raw model text, pre-validation
    provider: string               // "gemini" | "heuristic"
    model: string
    ok: boolean
    error?: string
    latencyMs: number
    createdAt: number

  settings/prefs                  // single fixed-id doc. dayEndMin is written
                                     from Slice 4's schedule editor; the rest
                                     is Slice 6/7/8 and not written yet
    dayEndMin?: number             // evening cutoff, minutes past local
                                     // midnight. Absent = the caller's 1260
                                     // (21:00) default. See 04-tdd.md §core/time
    theme: "light" | "dark" | "auto"
    aiProvider: string
    aiModel: string
    googleRefreshTokenEncrypted?: string   // see §Calendar OAuth — currently
                                             // unreachable via Firebase Auth
    googleConnectedAt?: number
    googleLastSyncedAt?: number
    googleSyncStatus?: string      // "ok" | "expired" | "error"
```

Composite indexes for `tasks` (`status` + `laneOrder` ascending, `status` +
`completedAt` descending) live in `firestore.indexes.json`, not in this schema.

## Why each table exists

| Table | Read by | Written by | Notes |
|---|---|---|---|
| `courses` | S2 rail grouping, card labels | Parse (auto-creates on first sighting), S5, S6 course mgmt | Text label only. **No colour column** — course identity is never carried by hue |
| `tasks` | Every region of S2, S5 | Capture, drag, keyboard move, complete, breakdown, edit | The centre of the system |
| `scheduleBlocks` | Capacity engine, Today's shape, S4 | S4 only | Entered once per semester. Half of the v1 time model |
| `calendarCache` | Capacity engine, Today's shape | Calendar sync only (S7 "Sync now" or a Vercel Route Handler on focus) | The other half. Pure cache — if empty or stale, capacity falls back to the manual schedule alone, silently |
| `aiLog` | S6 review list, manual quality review | Every AI call | **The only honest measure of whether the core promise works.** Without it, parse quality is a guess |
| `settings` | S6, theme boot, Calendar status everywhere, **the capacity engine** (`dayEndMin`) | **S4** (`dayEndMin`), S6, the OAuth callback, sync | One document per user (`settings/prefs`). Would hold that user's encrypted refresh token — see §Calendar OAuth for why that field is currently unreachable |

## Ordering within a lane

`laneOrder` is a **sparse float**. Inserting between two cards sets
`(prev + next) / 2`; inserting at either end offsets by ±1024. This makes a
reorder a single-document write instead of renumbering the lane, which matters
because reorder fires on every drop. The arithmetic itself is pure —
`core/order.ts`'s `computeLaneOrder`, unit-tested with no backend or emulator.

Floats degrade after very many insertions between the same pair. At ~40 tasks
this will not be reached; if it ever is, renormalise the lane to integers on read.

## Invariants

Enforced in `firestore.rules` where a rule can express them (rules see one
document at a time — the ownership path and single-document field checks
below), and in `firebase/tasks.ts`'s client-side `runTransaction` where a rule
cannot (a cross-document constraint):

1. **At most one task has `status: "now"`.** Promoting a second demotes the
   incumbent to `next`, both writes inside the same client-side
   `runTransaction` — atomic and correct for a well-behaved client, but **not
   database-enforced** the way a Convex mutation was. This is the one
   invariant `firestore.rules` genuinely can't express (see
   `00-stack-decision.md` v4.0's tradeoffs); blast radius is one user's own
   board.
2. **A task with `parentId` set is a step**; its parent is never schedulable and
   never appears in a lane. Only steps carry a meaningful `laneOrder`.
3. **`completedAt` is set if and only if `status === "done"`.** Enforced in
   `firestore.rules`.
4. **`rawText` is immutable after creation.** Enforced in `firestore.rules`
   (an `update` may not change it). Editing (M14) changes `title` only — this
   is what makes `aiLog` comparison meaningful later.
5. **`estimateMin > 0`.** Enforced in `firestore.rules`. A zero-effort task
   breaks the capacity engine's premise.

## Auth

Firebase Auth, Google + email/password providers, open signup at `/signup`
(`docs/00-intake.md`'s Amendment 4 — the invite gate from Amendment 3 is
dropped). `proxy.ts` verifies the session cookie (an ID token) with `jose`'s
`createRemoteJWKSet`/`jwtVerify` against Google's Secure Token JWKS before a
protected route is even served — no Admin SDK, no service-account secret.
Client-side, `firebase/hooks.tsx`'s `AuthProvider` keeps that cookie in sync
via `onIdTokenChanged`.

With multiple users, "is anyone signed in" is not the ownership model —
**the document path is.** Every user's data lives under `users/{uid}/…`, and
`firestore.rules`'s `isOwner(uid)` helper (`request.auth.uid == uid`) is
checked on every read and write to that path, before any app code runs. This
is structurally stronger than the previous `doc.userId === userId` check in
Convex handler code: there is no code path that could forget it, because
there's no handler — a client that constructs a request against another
user's path is rejected by the rule, not by an application-level `if`.

## Calendar OAuth

**Not yet built (Slice 6).** Firebase's Spark (no-billing) plan has no Cloud
Functions, and Firebase Auth's own Google sign-in provider returns only a
short-lived access token — no refresh token — so `settings.googleRefreshTokenEncrypted`
as designed above is **unreachable via Firebase Auth alone**. The OAuth code
exchange will run in a **Vercel Route Handler** instead (free on the hobby
tier), encrypt the refresh token, and write it to `settings/prefs` via the
Firestore client SDK. A separate sync path, triggered by "Sync now" or
focus-revalidation, decrypts the token, refreshes it, fetches events for
`[today, today+14d]`, and replaces `calendarCache` wholesale — simplest
possible correctness model for a cache this small. This was flagged in
`docs/06-firebase-migration.md` before Slice 6 started, not discovered mid-slice.

## Retention

- `tasks` — kept indefinitely. `done` tasks leave the Done lane after their day
  via the `status`+`completedAt` composite index, not by deletion.
- `calendarCache` — replaced wholesale on every sync. Never accumulates.
- `aiLog` — kept indefinitely at this volume. If it ever grows, trim by
  `createdAt`; nothing depends on it.
- Export-all-data (S6) serialises every subcollection to JSON, excluding the
  encrypted Google token. There is no import in v1.

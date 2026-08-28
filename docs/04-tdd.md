> **Project:** Adlaw · **Doc:** TDD (Technical Design Document) · **Version:** 4.0 · **Date:** 2026-08-26
> **Status:** Draft — 1 unresolved placeholder. Moved to Firebase; see `00-stack-decision.md` v4.0
> **Upstream:** `00-stack-decision.md`, `01-prd.md`, `02-app-flow.md`, `03-backend-schema.md`

# Technical design

*TDD here means Technical Design Document, not test-driven development.*

## Module map

```
app/                    Next.js routes. Thin — layout and data wiring only
  page.tsx              S0 landing (public, server component)
  (auth)/login          S1
  board/page.tsx        S2 board (+ board/layout.tsx, metadata only)
  icon.tsx              favicon, generated from the day-mark (next/og)
  apple-icon.tsx         iOS home-screen icon, same source, opaque
  FirebaseProvider.tsx  thin wrapper around firebase/hooks.tsx's AuthProvider
  api/                   Vercel Route Handlers — the server boundary Firebase's
                         Spark plan needs in place of Cloud Functions
    calendar/callback/    OAuth code exchange (Slice 6, not built)
    ai/                   keeps the Gemini API key off the client (Slice 7, not built)
firebase/
  client.ts              app/auth/firestore init from NEXT_PUBLIC_FIREBASE_* env
  auth.ts                signInWithGoogle / signInWithEmail / signUpWithEmail /
                         signOut, plus the session-cookie sync
  tasks.ts               typed writes; move() is the client-side runTransaction
                         enforcing one-"now" — see 03-backend-schema §Invariants
  hooks.tsx              useAuth, useTasksByStatus / useDoneToday / useCourses —
                         onSnapshot wrappers returning T[] | undefined
core/                   PURE. No I/O, no React, no Firebase imports
  types.ts              Task, Course, TaskStatus, ParseState — plain data,
                         replaces generated Doc<>/Id<> types
  order.ts               laneOrder arithmetic — computeLaneOrder, unit-tested
                         with no backend or emulator
  time.ts                free-window derivation                    (Slice 4, not built)
  capacity.ts             totals, overage, cutline index             (Slice 4, not built)
  heuristic.ts           rules-based parser — the fallback. Built, and the only parser today
ai/                      (Slice 7, not built)
  types.ts               ParsedTask, BreakdownResult, FocusPick + Zod schemas
  gemini.ts              provider adapter
  index.ts               provider selection
ui/
  board/                 lanes, cards, cutline (+ shell.module.css, the .app/.day grid)
  landing/               S0 sections, copy.ts fixtures, demos/ miniatures
  theme/                 shared theme toggle + applyTheme (storage key lives here)
  graphics/              DayMark — the one graphic, public surfaces only (S0 + S1)
  type/                  TaglineWord — the rotating "A day that ___" word,
                         public surfaces only
  timeline/               Today's shape                             (Slice 5, not built)
  capture/                input + live preview. Built, Firebase-wired
  settings/                S6 + S7 (Calendar connect)                (Slice 8, not built)
  drag/                   pointer tracking, spring, FLIP. Built
  tokens.css              DESIGN.md, verbatim
```

The boundary that matters: **`core/` has no imports outside itself.** It is
plain functions over plain data. Everything hard about this app — free windows,
overlap, capacity, the cutline — lives there and is testable without a browser, a
database, a network, or a mock. This boundary is what made all three prior
data-layer swaps (Convex → Postgres → Convex → Firebase) mechanical rather than
rewrites — `core/` never moved. The Firebase swap also moved two previously
Convex-coupled concerns permanently into that boundary: `core/types.ts` (plain
data shapes, so `ui/` depends on `core/` rather than a backend codegen
artifact) and `core/order.ts` (laneOrder arithmetic, freed from the mutation it
used to be trapped inside).

## Data flow

```
type a sentence
  → core/heuristic (local, instant)          → live preview chips
Enter
  → app/api/ai/parse (Route Handler, ≤4s)     — Slice 7, not built. Keeps the
      → ai/gemini → JSON → Zod                Gemini key server-only, the same
      → on any failure: core/heuristic        role convex/ai.ts's action had
  → firebase/tasks.create()                  → writes task (+ aiLog, Slice 7)
  → onSnapshot pushes to every mounted region — no manual revalidation call

board renders
  → firebase/hooks: useTasksByStatus + (Slice 4) schedule listener + (Slice 6)
    calendarCache listener — all onSnapshot, reactive by default
  → core/time.freeWindows(blocks, events, today)
  → core/capacity.layout(queue, windows, now)
  → { totalMin, overMin, cutlineIndex, planBlocks[] }
  → lanes, cutline, capacity slot, Today's shape all read the same object

Calendar sync ("Sync now", S7, or focus-triggered)
  → app/api/calendar/sync (Route Handler)     — Slice 6, not built
      → decrypt refresh token → Google Calendar API, window = today..+14d
      → replace calendarCache wholesale (Firestore batch write)
  → onSnapshot for calendarCache pushes automatically — no revalidation logic
```

One computation feeds all four capacity surfaces. They cannot disagree, because
there is nothing for them to disagree about. Calendar sync only ever changes an
*input* to that computation — it never has its own opinion about capacity.

## `core/time`

```ts
freeWindows(blocks: ScheduleBlock[], events: CalendarEvent[], date: Date): Window[]
```

Selects blocks active on `date` by weekday and `activeFrom`/`activeTo`, merges in
calendar events overlapping `date`, merges all overlaps together, inverts against
the day, and clips to `[now, dayEnd]`.

Edge cases that must be handled and tested: overlapping schedule blocks (merge,
don't double-count) · a calendar event overlapping a schedule block (one merged
busy interval, not double-subtracted) · a block ending exactly when another
begins (no zero-length gap) · blocks crossing midnight (clip, don't wrap) · DST
transitions (blocks are minutes-past-local-midnight precisely so 09:00 stays
09:00; calendar events are absolute timestamps and need no such care) · a day
with no blocks and no events (one window, now → dayEnd) · a fully-booked day (no
windows, capacity zero) · **an empty or stale `calendarCache`** (degrade to
schedule-only silently, never throw).

`dayEnd` in v1 is the start of the first `work` block after now, falling back to
a configured evening cutoff. **Resolved (Slice 4):** that cutoff is
`settings/prefs.dayEndMin`, editable from the schedule editor and defaulting to
`1260` (21:00). The default is applied by the caller — `ui/board/useDayPlan.ts` —
not by `resolveDayEnd`, which keeps `core/time` free of any product default and
lets tests state the cutoff explicitly.

## `core/capacity`

```ts
layout(queue: Task[], windows: Window[], now: number): CapacityResult
```

Walks the queue in order, packing each task into remaining free time. Returns
total planned, overage, the index where the day runs out, and absolute
start/end times per task for Today's shape.

Pure, synchronous, and the single source for every number the interface shows.
**No AI call and no Calendar sync may produce any value in `CapacityResult`
directly** — Calendar only ever feeds `freeWindows`, one layer below.

## The AI layer

Three operations, exposed as `app/api/ai/*` Route Handlers rather than Convex
actions — Firebase's Spark plan has no Cloud Functions, and the Gemini API key
must never reach the client, so a Vercel Route Handler is the server boundary
that plays the role Convex actions used to.

| Action | Contract | Trigger |
|---|---|---|
| `parse` | `{ title, courseCode?, estimateMin, dueAt?, shouldSplit }` | Capture submit |
| `breakdown` | `{ steps: [{ title, estimateMin }] }` | `shouldSplit`, or S5 button |
| `focus` | `{ taskId, reason }` | A user action leaves `now` empty (e.g. completing the active Task), or *Not this one* |

Each: build prompt → call provider with a response schema → parse JSON →
validate with Zod → write `aiLog` → return. Every failure path (network, quota,
timeout, malformed JSON, schema mismatch) converges on the same handler: log it,
fall back, never throw to the UI.

```ts
export interface AiProvider {
  parse(text: string, ctx: ParseContext): Promise<ParsedTask>;
  breakdown(task: Task): Promise<BreakdownResult>;
  focus(input: FocusInput): Promise<FocusPick>;
}
```

`GeminiParser` and `HeuristicParser` both implement it. `HeuristicParser.breakdown`
returns a naive even split; `HeuristicParser.focus` picks by earliest due date
that fits the current window. Both are useful answers, not stubs — the app is
fully functional with no API key at all. Provider and model are chosen at
runtime from `settings`, exposed in S6, not hardcoded — part of the "fully built
config" surface from the earlier amendment, unaffected by this stack swap.

## Calendar integration

`app/api/calendar/*` Route Handlers own three operations. Firebase Auth's own
Google sign-in provider returns only a short-lived access token, never a
refresh token, so `settings.googleRefreshTokenEncrypted`
(`03-backend-schema.md`) is unreachable through sign-in alone — Calendar needs
its own, separate OAuth consent step:

- **`connect`** — redirect to Google's OAuth consent screen
  (`calendar.readonly` scope only). The callback is a Vercel Route Handler
  (`app/api/calendar/callback`), which exchanges the code, encrypts the
  refresh token, and writes it to `settings/prefs` via the Firestore client SDK.
- **`sync`** (Route Handler) — decrypt the token, refresh the access token,
  fetch events for `[today, today+14d]`, replace `calendarCache` wholesale,
  update `googleLastSyncedAt` / `googleSyncStatus`.
- **`disconnect`** — delete the stored token and clear `calendarCache`
  (plain Firestore writes, no server boundary needed for a delete).

Token refresh failure (revoked access, expired grant) sets
`googleSyncStatus = "expired"` and is surfaced in S7 and as the quiet Today's
shape prompt — never a thrown error the board has to recover from, per M13's
acceptance criteria.

## Drag system

Pointer Events, `setPointerCapture`, respecting the grab offset. A placeholder
holds the gap; the card goes `position: fixed` and tracks 1:1. On release, FLIP
from the release point to the settled position with a spring carrying release
velocity (`damping 0.88`, `response 0.4`). Independent X and Y springs — a single
2D spring desyncs when the axes have different velocities.

Only `transform` and `opacity` animate. `prefers-reduced-motion` collapses
springs to instant settles.

Keyboard equivalent is not an afterthought: focus a card, `1`/`2`/`3` moves it.
The same mutation runs either way, so the two paths cannot drift.

Order persists optimistically — the local reorder paints immediately, the
`firebase/tasks.move()` call follows, and the `onSnapshot` listener
reconciles automatically.

## Error handling

| Failure | Behaviour |
|---|---|
| AI timeout > 4s | `AbortController`. Heuristic result, `parseState: "fallback"`, logged |
| Malformed JSON / schema mismatch | Same, with the raw response in `aiLog.output` for later inspection |
| Quota exhausted | Same, plus a persistent quiet indicator in S6 |
| Calendar token expired/revoked | `googleSyncStatus = "expired"`. Capacity falls back to schedule-only. Quiet prompt in S2 and S7, never blocking |
| Calendar API 5xx / rate limit | Keep the last `calendarCache`, show its age. No aggressive retry |
| Offline | Captures queue in `localStorage`; board reads whatever `onSnapshot` last delivered. Firestore's offline persistence isn't enabled yet — `firebase/client.ts`'s `initializeFirestore` would need `localCache: persistentLocalCache()` for a real local cache, tracked with the rest of M17 |
| Firestore unreachable | Board renders last cache read-only with a banner. Captures queue |
| Empty schedule | Capacity hidden rather than shown as zero. Prompt in Today's shape |

The rule underneath all of it: **degrade to a working board, never to a blocked
one.**

## Environment

| Var | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_APP_ID` | Vercel + local | From Firebase console → Project settings → Your apps → Web app. `NEXT_PUBLIC_` because `firebase/client.ts` runs in the browser bundle |
| `GEMINI_API_KEY` | **Vercel server environment only** | Never `NEXT_PUBLIC_`. `app/api/ai/*` Route Handlers are the only caller |
| `AI_PROVIDER`, `AI_MODEL` | Vercel | `gemini` \| `heuristic` — mirrors `settings`, seeds its default |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Vercel server environment | OAuth for Calendar, used inside `app/api/calendar/callback` |
| `TOKEN_ENCRYPTION_KEY` | Vercel server environment | Encrypts the stored Google refresh token at rest |

## Testing

| Layer | Target | Tool |
|---|---|---|
| Unit | `core/time`, `core/capacity`, `core/heuristic`. Every edge case listed above | Vitest, no mocks needed |
| Contract | Zod schemas against recorded model responses, including malformed ones | Vitest fixtures |
| Golden set | ~20 real sentences → expected parses, run against the live model on demand | Manual script |
| Ordering | laneOrder arithmetic — append, prepend, insert-between, stale-neighbor-degrades-to-append | `core/order.test.ts`, pure, no infrastructure |
| Firestore rules | Cross-user isolation, field validation (`estimateMin > 0`, `completedAt` iff `status==='done'`, `rawText` immutable) | `firestore.rules.test.ts` via `@firebase/rules-unit-testing` against the emulator — `npm run test:rules`, kept off the fast `npm test` loop since it needs Java + a running emulator |
| Accessibility | Token contrast in both themes; keyboard-only pass of capture → move → complete | Assertions + manual |
| E2E | Capture → Then → drag to Start here → capacity and timeline update; Calendar connect → sync → event appears in Today's shape | Playwright, two happy paths |

The unit layer carries the weight. It is pure, fast, mock-free, and it covers the
part of the system that is actually hard — and it's the one thing that hasn't
changed across either data-layer swap.

## Build order

Each slice ends with something usable — this is deliberate, because a half-built
planner that cannot be opened is how this project fails. Sized estimates are in
`01-prd.md` §Scope check; this is the sequencing, not the timeline argument.

1. **Skeleton.** Next + Firebase + Firebase Auth + tokens. Log in, see an empty
   board.
2. **Tasks.** Schema, capture with heuristic only, lanes, complete, delete+undo.
   *Usable here.*
3. **Movement.** Drag, keyboard, ordering, Done filtering.
4. **Time.** Schedule editor, `core/time` (schedule-only), `core/capacity`,
   capacity slot, cutline.
5. **Today's shape.** The timeline. *Product thesis is complete here, on the
   manual schedule alone.*
6. **Calendar.** OAuth, `calendarCache`, sync, S7, folding events into
   `core/time`. Board remains fully correct if this is skipped or fails.
7. **AI.** Gemini adapter, parse, `aiLog`. Breakdown, then focus pick.
8. **Config surfaces.** S6 provider/model selection, `aiLog` review list, course
   management (M16), data export.
9. **Polish.** Empty states, offline queue (M17), deploy.

Ship 1–5 before touching 6 or 7. The board must be worth opening on the manual
schedule and the heuristic parser alone; if it isn't, neither Calendar nor the AI
will save it.

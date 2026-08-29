# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

**Slices 1–5 built, plus a public landing surface and multi-user auth.**
Next.js (App Router) + Firebase (Firestore + Firebase Auth — Google and
email/password, open signup as of `docs/00-intake.md`'s Amendment 4) are wired
up; `DESIGN.md`'s tokens are in `ui/tokens.css`. Task capture (heuristic parser
only), lanes, complete, delete+undo, and drag all work, scoped per account.
The weekly schedule editor (`/schedule`), capacity math, cutline, and Today's
shape are built — the day has a real capacity figure on the manual schedule
alone. **No Calendar and no AI yet** — those are Slices 6–7 per
`docs/04-tdd.md` §Build order, which means capture is still heuristic-only and
nothing breaks a large task into steps or picks a focus task.

**The one computation rule.** `ui/board/useDayPlan.ts` is the single place
that calls `core/capacity`'s `layout()`. The capacity slot, the cutline, and
Today's shape all read its result; none may recompute. `CapacityResult`
guarantees `overageMin > 0` **exactly when** `cutIndex !== null`, so "does the
day fit" is always `cutIndex === null` and the over-by number is always
`overageMin` — never `plannedMin - freeMin`, which disagrees whenever packing
strands a window remainder too small for the next task.

**Routing:** `/` is the public marketing landing page, `/login` and `/signup`
are public, and the board lives at **`/board`**. `proxy.ts` is the only
redirect authority — authed visitors to `/`, `/login`, or `/signup` go to
`/board`; unauthed visitors to anything else go to `/login`. Never express
these as `next.config.ts` `redirects()`: those default to 308 permanent and
browsers cache them indefinitely, which would lock you out of the landing
page on that browser.

`/icon` and `/apple-icon` (Next's generated routes for `app/icon.tsx` and
`app/apple-icon.tsx`) are also in `proxy.ts`'s public list. Both are dot-less
URLs, so the middleware's catch-all matcher — which excludes paths with a dot,
the way it excludes `/favicon.ico` — doesn't exclude them on its own. Adding a
new file-convention route under `app/` (an OG image, another icon size) needs
the same check before assuming it's reachable while signed out.

Commands: `npm run dev` (Next + Turbopack — no separate backend dev process;
Firestore/Firebase Auth are serverless), `npm run lint`, `npx tsc --noEmit`,
`npm run build` (`next build`), `npm test` (Vitest, pure suite). Single test
file: `npx vitest run path/to/file.test.ts`; filter by name within it with
`-t "pattern"`. Tests cover `core/heuristic.ts`, `core/time.ts`,
`core/capacity.ts`, `core/order.ts`'s laneOrder
arithmetic, and `ui/landing/copy.ts`'s fixtures. `vitest.config.mts` includes
`**/*.test.ts` only — **no `.tsx`, and no environment is configured**, so
component tests need a config change first; keep new tests pure and they
don't. `npm run test:rules` runs `firestore.rules.test.ts` (cross-user
isolation, field validation) against the Firebase emulator — needs Java and
`firebase-tools`, kept off the fast `npm test` loop for that reason. It uses
its own `vitest.rules.config.mts`, because `vitest.config.mts` *excludes*
that file to keep `npm test` emulator-free and a CLI `--exclude` appends to
the exclude list rather than replacing it. `firebase.json` pins the Firestore
emulator to **port 8085**; the default 8080 collides with too much else.

`.env.local` needs six `NEXT_PUBLIC_FIREBASE_*` values from Firebase console →
Project settings → Your apps → Web app (API key, auth domain, project id,
storage bucket, messaging sender id, app id) before the app will hydrate in
the browser — `firebase/client.ts`'s `getAuth()` throws synchronously on a
malformed or missing key, which breaks every route including the public
landing page, since `app/FirebaseProvider.tsx` wraps the whole layout.

Signup at `/signup` is open — no invite code, no env var to set (Amendment 4
in `docs/00-intake.md` dropped Amendment 3's gate). Create an account through
`/signup` or the "Continue with Google" button directly; there is no seed
script.

`proxy.ts` at the repo root is Next.js 16's replacement for `middleware.ts`
(renamed in this version — see the breaking-change notes `AGENTS.md`
points at). It verifies the `session` cookie (an ID token) with `jose`
against Google's Secure Token JWKS — no Admin SDK, no service-account
secret — and redirects to `/login` on failure; don't add a `middleware.ts`
expecting it to do this job.

`AGENTS.md` at the repo root is generated and rewritten by `next dev` itself
(framework/version-specific breaking-change notes) — it's not a second
agent-instructions file competing with this one; leave it alone.

## Source of truth

Read these before proposing anything. `docs/00`–`05` is the current, authoritative
plan and **supersedes** `docs/superpowers/specs/2026-08-17-kanban-daily-planner-design.md`
wherever the two disagree (stack, scope) — that spec predates the 2026-08-17
amendment described below and is kept for design/behavioral detail it still gets
right (error handling shape, motion, the module-boundary philosophy), not for its
stack or scope sections.

| File | Authority over |
|---|---|
| `docs/00-intake.md` | Constraints, including the 2026-08-17 amendment (see below) |
| `docs/00-stack-decision.md` | The stack, and why — this is current, not the older design spec |
| `docs/01-prd.md` | Full v1 feature list, non-goals, the honest scope-vs-timeline call |
| `docs/02-app-flow.md` | Every screen, panel, and state machine — defines surfaces S1–S7 (Lock, Board, First run, Schedule editor, Task detail, Settings, Calendar connect), referenced by shorthand throughout `04-tdd.md` |
| `docs/03-backend-schema.md` | Firestore schema, invariants, how access control works without RLS |
| `docs/04-tdd.md` | Module map, data flow, error handling, testing, build order |
| `docs/05-design-brief.md` | Design intent — pairs with `DESIGN.md` for values |
| `PRODUCT.md` | Register, users, the four failures the product exists to prevent, anti-references, a11y floor |
| `DESIGN.md` | Every color token (both themes), type scale, elevation, spring parameters, the ban list |
| `docs/design/prototype.html` | The approved interface, as a working prototype. Open it in a browser rather than guessing at layout |
| `CONTEXT.md` | The domain glossary — Task/Step/Status, Free window/Capacity/Cutline, `parseState`, Course. Use these terms as defined; don't drift to synonyms it explicitly avoids (e.g. "card" for Task, "gap" for Free window) |

### The 2026-08-17 amendments (two, same day)

**Amendment 1 — scope.** The author directed: build the full feature set and
expose full configuration, disregarding the earlier constraint that scoped the
stack and feature list down for being new to full-stack. This moved **Google
Calendar from deferred-to-v2 into v1**, read-only, and made config/review
surfaces (AI provider selection, `aiLog` review, data export) first-class v1
screens rather than future work. It also moved the data layer from Convex to
**Postgres (Supabase)** — that specific choice was reverted again by
Amendment 2.

**Amendment 2 — infrastructure.** The author's Supabase account hit its
free-project limit. The data layer moved back to **Convex**, which also meant
the auth mechanism changed from a hand-rolled password cookie to **Convex Auth's
password provider (one seeded account)** — not a preference, but a real
consequence of Convex's client-calls-functions-directly model, which has no
server-only boundary for a bespoke cookie check to hide behind.

`docs/00-intake.md` carries both amendment texts, plus two more. **Amendment
3 — multi-user (2026-08-23)** reversed the single-account, no-signup model —
`/signup` created new accounts behind a shared invite code
(`SIGNUP_INVITE_CODE`), and every table was scoped by `userId`. **Amendment 4
— Firebase (2026-08-26)** moved the data layer a fourth time (Convex →
Postgres → Convex → **Firebase**), added Google sign-in, and **dropped
Amendment 3's invite gate** — signup is open now, and ownership moved from a
`userId` field to Firestore's structural `users/{uid}/…` subcollection paths.
Unaffected by any of the four: budget (zero) and the read-only Calendar sync
direction — neither was ever about skill level, infrastructure availability,
or user count.

`docs/design/prototype.html` is a reference artifact, not shipping code — it is
plain HTML/CSS/JS with hardcoded fixture data. Port its *behavior and tokens*
into the real app; do not import the file.

## What this app is

A daily planner for a student, one account per student (open signup as of
Amendment 4, no cross-account sharing). You type one sentence; the app infers course,
effort, deadline, and steps. The day has a finite capacity derived from a
manual weekly schedule plus a read-only Google Calendar overlay, and
overcommitment is visible in the layout rather than announced.

The ranked failures it exists to prevent — abandonment first, then
overcommitment, cold start, deadline ambush — are the tiebreaker for design
arguments. Abandonment outranks everything: a feature that adds upkeep is
suspect no matter how smart it is.

## Chosen stack

Next.js (App Router) on Vercel · **Firebase** — Firestore for data, Firebase
Auth for identity (Google + email/password, open signup) · an ID-token cookie
verified with `jose` in `proxy.ts` · Google Gemini (free tier, via a swappable
`AiProvider` adapter — not Anthropic) · hand-written CSS using `DESIGN.md`
tokens, no component library.

Access is Firestore's own rules, not a hand-rolled cookie check or a `userId`
column — the client calls Firestore directly, and `firestore.rules`'s
`request.auth.uid` check against the `users/{uid}/…` path is the entire
ownership model. No path bypasses it, because there's no application code in
the loop to bypass. Signup is open to the public internet as of Amendment 4 —
a deliberate reopening of the quota exposure Amendment 3's invite gate existed
to prevent. Google OAuth for the **v1** Calendar overlay's `calendar.readonly`
refresh token is a separate consent step from sign-in (Firebase Auth's own
Google provider returns no refresh token) — that exchange is deferred to a
Vercel Route Handler (Slice 6, not built; Firebase's Spark plan has no Cloud
Functions). See `docs/00-stack-decision.md` v4.0 for the full reasoning and the
three-reversal history (Convex → Postgres → Convex → Firebase).

## Module map

From `docs/04-tdd.md` §Module map — where things go once scaffolding starts:

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
    calendar/callback/    OAuth code exchange                     (Slice 6, not built)
    ai/                   keeps the Gemini API key off the client (Slice 7, not built)
firebase/
  client.ts              app/auth/firestore init from NEXT_PUBLIC_FIREBASE_* env
  auth.ts                signInWithGoogle / signInWithEmail / signUpWithEmail /
                         signOut, plus the session-cookie sync
  tasks.ts               typed writes; move() is the client-side runTransaction
                         enforcing one-"now"
  schedule.ts            scheduleBlocks writes + setDayEnd. endBlock() sets
                         activeTo rather than deleting, so a semester change
                         doesn't destroy history
  hooks.tsx              useAuth, useTasksByStatus / useDoneToday / useCourses /
                         useScheduleBlocks / usePrefs — onSnapshot wrappers
                         returning T[] | undefined
core/                   PURE. No I/O, no React, no Firebase imports
  types.ts              Task, Course, TaskStatus, ParseState — plain data,
                         replaces generated Doc<>/Id<> types
  order.ts               laneOrder arithmetic — computeLaneOrder, unit-tested
                         with no backend or emulator
  time.ts               free-window derivation — busyIntervals, resolveDayEnd,
                         freeWindows. Minutes past local midnight throughout
  capacity.ts           layout() — totals, overage, cutline index, per-task
                         start/end. The ONLY caller is ui/board/useDayPlan.ts
  heuristic.ts          rules-based parser — the fallback. Built, and the only parser today
ai/                      (Slice 7, not built)
  types.ts              ParsedTask, BreakdownResult, FocusPick + Zod schemas
  gemini.ts             provider adapter
  index.ts              provider selection
ui/
  board/                lanes, cards, cutline (+ shell.module.css, the .app/.day
                        grid). useDayPlan.ts lives here — the single layout()
                        call site every capacity surface reads
  landing/              S0 sections, copy.ts fixtures, demos/ miniatures
  theme/                shared theme toggle + applyTheme (storage key lives here)
  graphics/             DayMark — the one graphic, public surfaces only (S0 + S1)
  type/                 TaglineWord — the rotating "A day that ___" word,
                        public surfaces only. Readings live in its CSS as
                        ::after content on purpose — keeping them out of the
                        DOM is what stops the landing <h1> indexing as all
                        four at once. Don't "simplify" them back inline
  timeline/              Today's shape — committed vs planned tracks, now-line,
                         day edge. Rendered inside ui/board/StartHere.tsx
  schedule/              S4 week grid + the editable day edge. Writes commit
                         per edit, no save button
  capture/               input + live preview. Built, Firebase-wired
  settings/               S6 + S7 (Calendar connect)                (Slice 8, not built)
  drag/                  pointer tracking, spring, FLIP. Built
  tokens.css             DESIGN.md, verbatim
```

Lines marked "not built" are `docs/04-tdd.md`'s target locations for later slices —
don't `Read` them expecting content; check `git status`/the directory first.

**`ui/landing/` may not import from `ui/board/`.** Every board component is
`"use client"` + a `firebase/hooks.tsx` listener that resolves to `undefined`
forever for a signed-out visitor with no `uid` to query — importing one into
the public page gives a signed-out visitor a permanently-empty board instead
of the page it expected. The two exceptions are the pure modules:
`core/heuristic.ts` (the landing hero runs the real parser live) and
`ui/board/format.ts`. The miniatures under `ui/landing/demos/` are static
reproductions ported from `docs/design/prototype.html`.

The boundary that matters: **`core/` has no imports outside itself.** It is
plain functions over plain data, testable without a browser, a database, a
network, or a mock. This boundary is what made all three prior data-layer
swaps (Convex → Postgres → Convex → Firebase) mechanical rather than
rewrites — `core/` never moved.

## Architecture rules that are easy to violate

These are the constraints that cross file boundaries and won't be obvious from
reading any single module.

- **`core/time` and `core/capacity` are pure.** No I/O, no network, no DB. They
  own free-window derivation and all capacity/cutline/plan-track math, and they
  are the correctness core that tests target without mocks.
- **Deterministic math never goes through the model.** The AI structures language;
  it does not do arithmetic. Capacity, overage, cutline position, and time layout
  are TypeScript. Routing any of it through a prompt is a bug.
- **Day plans are derived, never stored.** Free windows and capacity are computed
  on read from `scheduleBlocks` + `calendarCache` (**v1**, not deferred — see
  Amendment 1 above). `calendarCache` is a cache, replaced wholesale on every
  sync, and must stay safe to clear entirely. If it's empty or stale, capacity
  falls back to the manual schedule alone, silently — never a thrown error.
- **Capture never fails.** If a parse errors or exceeds 4s, create the card from
  raw text with a heuristic estimate, mark `parse_state = 'fallback'`, and offer a
  quiet retry. No spinner, no modal, no blocked input, ever.
- **Every AI call is user-triggered.** Nothing on a timer, on page load, or in the
  background.
- **All AI responses are Zod-validated before touching the DB,** and logged to
  `ai_log` — that table is the only honest measure of whether the core promise works.
- **`status = 'now'` holds at most one task.** Enforced client-side in a
  Firestore transaction (`firebase/tasks.ts`'s `move()`), not server-enforced —
  see `docs/00-stack-decision.md` v4.0's tradeoffs.
- **Every drag needs a keyboard equivalent.** The primary loop (capture, move,
  complete) must be fully operable without a pointer.
- **The `session` cookie is deliberately not HttpOnly.** `firebase/auth.ts`'s
  `syncSessionCookie` writes the Firebase ID token from client JS because
  `proxy.ts` has to read it and there is no Admin SDK to mint a server-side
  session cookie instead. This is accepted, not overlooked: the Firebase SDK
  already keeps the same token in IndexedDB, so HttpOnly would not remove the
  exposure. The compensating control is `next.config.ts`'s CSP — specifically
  `connect-src`, which is what stops injected script from *sending* a token
  anywhere. Don't "fix" this by making the cookie HttpOnly; that breaks
  `proxy.ts` and protects nothing.
- **Never trust a uid from a request body.** `app/api/ai/*` identifies the
  caller only through the `x-adlaw-uid` header, which `proxy.ts` strips from
  every inbound request and re-sets from the verified JWT's `sub` claim. That
  strip-then-set is the whole guarantee — a new Route Handler that reads a uid
  from JSON instead has no authentication at all.

## Design constraints that are easy to violate

`DESIGN.md` carries the full ban list. The three that get broken most:

- **Exactly two saturated colors exist**: primary (blue, Notion `#0075de` since
  the 2026-08-18 pivot — committed, planned, complete, selected) and alert (red —
  past the edge of the day, nothing else). Neutrals carry a small warm chroma
  (~`0.003–0.006` at hue 68), not `0` — that was the pre-pivot rule. Courses are
  text labels; there is no per-course color system, and adding one is the failure
  mode, not the upgrade.
- **Text on a tint uses `--primary-ink` / `--alert-ink`, not `--primary` /
  `--alert`.** The latter pair misses the 4.5:1 AA floor against their own soft
  tints in light theme (4.05:1 and 3.88:1, measured). Keep `--primary` and
  `--alert` for fills, bars, and rules. See `DESIGN.md` §Color → Rules.
- **`docs/design/prototype.html` predates the palette pivot.** Its CSS hardcodes
  the old green primary (`oklch(… 162)`). Port its layout, motion, and structure;
  take colors from `ui/tokens.css`. It also uses `--lift-2`, a token that no
  longer exists — a resting card is `--edge` only.
- **No skeuomorphic props.** Physicality comes from material, depth, and motion.
  No paper textures, tape, stains, pins, or rotation jitter. An earlier draft was
  rejected for exactly this.
- **No warm-neutral surfaces** and none of the token names that come with them
  (`--paper`, `--cream`, `--linen`, `--parchment`, `--sand`).

Light and dark are both first-class and independently tuned — dimming that reads
fine on white destroys legibility on a dark ground, so `.past` opacity differs per
theme by design.

## Build order

From `docs/04-tdd.md` §Build order. Each slice ends with something usable —
sized estimates live in `01-prd.md` §Scope check, this is the sequencing, not
the timeline:

1. **Skeleton.** Next + Firebase + Firebase Auth + tokens. Log in, see an empty board.
2. **Tasks.** Schema, capture with heuristic only, lanes, complete, delete+undo.
   *Usable here.*
3. **Movement.** Drag, keyboard, ordering, Done filtering.
4. **Time.** Schedule editor, `core/time` (schedule-only), `core/capacity`,
   capacity slot, cutline.
5. **Today's shape.** The timeline. *Product thesis is complete here, on the
   manual schedule alone.*
6. **Calendar.** OAuth, `calendarCache`, sync, S7, folding events into `core/time`.
   Board remains fully correct if this is skipped or fails.
7. **AI.** Gemini adapter, parse, `aiLog`. Breakdown, then focus pick.
8. **Config surfaces.** S6 provider/model selection, `aiLog` review list, course
   management (M16), data export.
9. **Polish.** Empty states, offline queue (M17), deploy.

Ship 1–5 before touching 6 or 7. The board must be worth opening on the manual
schedule and the heuristic parser alone; if it isn't, neither Calendar nor the
AI will save it.

## Out of scope, deliberately

Each of these was considered and cut for product reasons, not deferred for
build-time convenience. Re-proposing one needs a reason, not an oversight.
**Reading** from Google Calendar is in v1 (see the amendment above) —
**writing** to it remains out, a separate decision about sync direction.
**Multiple accounts** are in (Amendment 3 above; the invite gate in front of
signup is gone as of Amendment 4, but the account model itself stands) —
**sharing or collaboration between accounts** remains out; every account's
data stays isolated from every other's:

gamification of any kind (XP, levels, streaks, confetti) · writing to Google
Calendar · notifications and reminders · a native mobile app · sharing or
collaboration between accounts · productivity analytics · recurring tasks.

## Working here

Before any UI work, load the `impeccable` skill (it reads `PRODUCT.md`, which
exists) plus the matching craft skill. Build interactive prototypes over static
mockups, and verify in a browser in **both** themes before presenting — contrast
and dimming bugs in this design system are invisible in one theme and obvious in
the other.

## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

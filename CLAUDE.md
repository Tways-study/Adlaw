# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

**Slices 1–3 built, plus a public landing surface.** Next.js (App Router) +
Convex + Convex Auth (password provider, one seeded account) are wired up;
`DESIGN.md`'s tokens are in `ui/tokens.css`. Task capture (heuristic parser
only), lanes, complete, delete+undo, and drag all work. No schedule editor,
capacity math, timeline, Calendar, or AI yet — those are Slices 4–7 per
`docs/04-tdd.md` §Build order.

**Routing:** `/` is the public marketing landing page, `/login` is public, and
the board lives at **`/board`**. `proxy.ts` is the only redirect authority —
authed visitors to `/` or `/login` go to `/board`; unauthed visitors to anything
else go to `/login`. Never express these as `next.config.ts` `redirects()`:
those default to 308 permanent and browsers cache them indefinitely, which would
lock you out of the landing page on that browser.

Commands: `npm run dev` (Next + Turbopack), `npx convex dev` (Convex functions,
run alongside `npm run dev` in a separate terminal — writes `.env.local`),
`npm run lint`, `npx tsc --noEmit`, `npm test` (Vitest). Tests cover
`core/heuristic.ts`, the Convex task mutations, and `ui/landing/copy.ts`'s
fixtures. `vitest.config.mts` includes `**/*.test.ts` only — **no `.tsx`, and no
environment is configured**, so component tests need a config change first; keep
new tests pure and they don't.

The one seeded account is created by `SEED_EMAIL=... SEED_PASSWORD=...
node scripts/seed-admin.mjs`, run once after `npx convex dev` has written
`.env.local`. `convex/auth.ts`'s `createOrUpdateUser` guard rejects every
signup after the first, so re-running the script is a no-op error, not a way
to add a second account — there is no signup route to test.

`proxy.ts` at the repo root is Next.js 16's replacement for `middleware.ts`
(renamed in this version — see the breaking-change notes `AGENTS.md`
points at). It's what gates every route behind Convex Auth and redirects
to `/login`; don't add a `middleware.ts` expecting it to do this job.

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
| `docs/03-backend-schema.md` | Convex schema, invariants, how access control works without RLS |
| `docs/04-tdd.md` | Module map, data flow, error handling, testing, build order |
| `docs/05-design-brief.md` | Design intent — pairs with `DESIGN.md` for values |
| `PRODUCT.md` | Register, users, the four failures the product exists to prevent, anti-references, a11y floor |
| `DESIGN.md` | Every color token (both themes), type scale, elevation, spring parameters, the ban list |
| `docs/design/prototype.html` | The approved interface, as a working prototype. Open it in a browser rather than guessing at layout |

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

`docs/00-intake.md` carries both amendment texts. Unaffected by either: budget
(zero), single-user scope, and the read-only Calendar sync direction — none of
those were ever about skill level or infrastructure availability.

`docs/design/prototype.html` is a reference artifact, not shipping code — it is
plain HTML/CSS/JS with hardcoded fixture data. Port its *behavior and tokens*
into the real app; do not import the file.

## What this app is

A single-user daily planner for one student. You type one sentence; the app infers
course, effort, deadline, and steps. The day has a finite capacity derived from a
manual weekly schedule plus a read-only Google Calendar overlay, and
overcommitment is visible in the layout rather than announced.

The ranked failures it exists to prevent — abandonment first, then
overcommitment, cold start, deadline ambush — are the tiebreaker for design
arguments. Abandonment outranks everything: a feature that adds upkeep is
suspect no matter how smart it is.

## Chosen stack

Next.js (App Router) on Vercel · **Convex** for data, server functions, and auth
· Convex Auth, password provider, one seeded account · Google Gemini (free tier,
via a swappable `AiProvider` adapter — not Anthropic) · hand-written CSS using
`DESIGN.md` tokens, no component library.

Access is Convex Auth's password provider, not a hand-rolled cookie — the React
client calls Convex functions directly for live reactive queries, so there's no
server-only boundary a bespoke check could hide behind, and Convex functions
need a real identity to check via `ctx.auth`. There is still only one account,
seeded at setup, with no public signup route. Google OAuth exists *only* to
obtain a `calendar.readonly` refresh token for the **v1** Calendar overlay —
the token exchange runs in a Convex HTTP action, not a Next.js API route. See
`docs/00-stack-decision.md` v3.0 for the full reasoning and the two-reversal
history (Convex → Postgres → Convex).

## Module map

From `docs/04-tdd.md` §Module map — where things go once scaffolding starts:

```
app/                    Next.js routes. Thin — layout and data wiring only
  page.tsx              S0 landing (public, server component)
  (auth)/login          S1
  board/page.tsx        S2 board (+ board/layout.tsx, metadata only)
convex/
  schema.ts             03-backend-schema
  tasks.ts              queries + mutations, invariants enforced here
  schedule.ts           schedule block CRUD
  ai.ts                 actions: parse, breakdown, focus (network lives here)
  calendar.ts           actions: sync, disconnect
  http.ts               HTTP action: Google OAuth callback (*.convex.site URL)
  auth.ts               Convex Auth config, password provider
core/                   PURE. No I/O, no React, no Convex imports
  time.ts               free-window derivation from schedule blocks + calendar cache
  capacity.ts           totals, overage, cutline index, plan-track layout
  heuristic.ts          rules-based parser — the fallback
ai/
  types.ts              ParsedTask, BreakdownResult, FocusPick + Zod schemas
  gemini.ts             provider adapter
  index.ts              provider selection
ui/
  board/                lanes, cards, cutline (+ shell.module.css, the .app/.day grid)
  landing/              S0 sections, copy.ts fixtures, demos/ miniatures
  theme/                shared theme toggle + applyTheme (storage key lives here)
  timeline/              Today's shape
  capture/               input + live preview
  settings/               S6 + S7 (Calendar connect)
  drag/                  pointer tracking, spring, FLIP
  tokens.css             DESIGN.md, verbatim
```

**`ui/landing/` may not import from `ui/board/`.** Every board component is
`"use client"` + `useQuery` against `api.tasks`, and `convex/tasks.ts` throws
`"Not signed in"` for an unauthenticated caller — importing one into the public
page gives a signed-out visitor console errors and permanently-undefined
queries. The two exceptions are the pure modules: `core/heuristic.ts` (the
landing hero runs the real parser live) and `ui/board/format.ts`. The miniatures
under `ui/landing/demos/` are static reproductions ported from
`docs/design/prototype.html`.

The boundary that matters: **`core/` has no imports outside itself.** It is
plain functions over plain data, testable without a browser, a database, a
network, or a mock. This boundary is what made the two prior data-layer swaps
(Convex → Postgres → Convex) mechanical rather than rewrites — `core/` never
moved.

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
- **`status = 'now'` holds at most one task.** Enforced in the mutation layer.
- **Every drag needs a keyboard equivalent.** The primary loop (capture, move,
  complete) must be fully operable without a pointer.

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

1. **Skeleton.** Next + Convex + Convex Auth + tokens. Log in, see an empty board.
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
**writing** to it remains out, a separate decision about sync direction:

gamification of any kind (XP, levels, streaks, confetti) · writing to Google
Calendar · notifications and reminders · a native mobile app · multi-user or
sharing · productivity analytics · recurring tasks.

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

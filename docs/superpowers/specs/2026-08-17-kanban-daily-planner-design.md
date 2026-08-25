# Adlaw — Design Spec

**Date:** 2026-08-17
**Status:** Approved for planning
**Register:** product (see `PRODUCT.md`)

---

## 1. What this is

A single-user daily planner for one student. You capture a task as one plain
sentence; the app infers its course, effort, deadline, and constituent steps. The
day has a finite capacity derived from a manually-entered class schedule plus a
read-only Google Calendar overlay, and planning past that capacity is visible in
the layout rather than announced in a banner.

It exists to prevent four named failures, in priority order:

1. **Abandonment.** Set up beautifully, used four days, then silence. This is the
   meta-failure — every decision below is downstream of it.
2. **Overcommitment.** Ten things planned into a day that fits four.
3. **Cold start.** Freezing because choosing costs more than doing.
4. **Deadline ambush.** A large assignment sitting as one undifferentiated card.

Success is behavioral and narrow: it is still open in week six.

## 2. Decisions already locked

| Decision | Choice | Why |
|---|---|---|
| Users | One. No accounts, no sharing, no multi-tenant | Personal tool. Removes auth, onboarding, permissions entirely |
| Hosting | Hosted at a URL, not local-only | An app you must start from a terminal is an app you stop starting. Reachability is most of the abandonment fix |
| Input | One sentence, zero fields | Every field is a reason to quit in week two |
| Time model | Manual weekly schedule (base) + read-only Google Calendar (overlay) | Manual keeps working when sync breaks. Read-only is the smallest surface that answers "when am I free" |
| Calendar writes | None | Two-way sync is the hardest thing in the app and buys nothing the read gives us |
| Visual register | Object, not document. Apple/Things calm | Physicality from material, depth, and motion — never props |
| Themes | Light and dark, both designed | Used at 11pm in a dim room and midday in a bright library |

## 3. Architecture

### 3.1 Stack

- **Next.js (App Router) on Vercel.** Server Actions for mutations; the AI key and
  Google refresh token never reach the client.
- **Postgres (Supabase free tier) + Drizzle ORM.** The data is small and
  relational. Convex is a reasonable alternative if live reactivity later matters;
  it does not today, for one user on one screen.
- **Anthropic API, `claude-sonnet-5`,** called only from server routes.
- **No component framework.** Hand-written CSS with the token system in
  `DESIGN.md`. The surface is small and the visual system is specific enough that
  a generic component library would fight it.

### 3.2 Access control

A single shared secret. One password field, verified server-side, sets a signed
HTTP-only cookie with a long expiry. There is no user table and no session store.

Google OAuth exists **only** to obtain a `calendar.readonly` refresh token. It is
not the login mechanism. The refresh token is encrypted at rest and used
server-side only.

### 3.3 Module boundaries

Five units, each independently testable, each with one job:

| Module | Job | Depends on |
|---|---|---|
| `core/time` | Minute arithmetic, weekly schedule → free windows for a date, merging calendar events into those windows | nothing (pure) |
| `core/capacity` | Given an ordered queue and free windows: total planned, overage, the cutline index, and the laid-out plan track | `core/time` (pure) |
| `ai/` | Three prompt-backed operations, each returning a schema-validated object | Anthropic SDK |
| `data/` | Drizzle schema, queries, migrations | Postgres |
| `ui/` | Board, focus card, timeline, capture bar, drag system | `core/*` via server-loaded props |

`core/time` and `core/capacity` are pure functions with no I/O. **All capacity and
scheduling math is deterministic TypeScript, never an LLM call.** The model
structures language; it does not do arithmetic.

## 4. Data model

```
course          id, code, name, active
task            id, title, raw_text, course_id?, estimate_min, due_at?,
                status, lane_order, parent_id?, step_index?,
                parse_state, created_at, completed_at?
schedule_block  id, weekday, start_min, end_min, label, kind, active_from, active_to?
calendar_cache  gcal_id, starts_at, ends_at, title, fetched_at
ai_log          id, kind, input, output, model, tokens, latency_ms, created_at
```

- `status` ∈ `shelf | next | now | done`. `now` holds at most one task — enforced
  in the mutation, not the schema.
- `parent_id` + `step_index` model the AI breakdown: a parent task with ordered
  child steps. The parent is never scheduled; its steps are.
- `parse_state` ∈ `ok | fallback | failed`. A card whose parse failed is still a
  usable card.
- `schedule_block.active_from/to` let the schedule change between semesters
  without destroying history.
- `calendar_cache` is a cache, never a source of truth. Safe to truncate.
- `ai_log` exists to debug parse quality against real sentences. It is the only
  way to know whether the core promise is actually working.

Day plans are **derived, never stored.** Free windows and capacity are computed
from `schedule_block` + `calendar_cache` on read.

## 5. The AI layer

Three operations. Each uses tool-use for structured output and validates the
result with Zod before it touches the database.

**`parseCapture(text) → { title, courseCode?, estimateMin, dueAt?, shouldSplit }`**
The core promise. Runs on submit, target under 2s.

**`breakdown(task) → { steps: [{ title, estimateMin }] }`**
Triggered when `shouldSplit` is true (roughly: estimate ≥ 2h, or the text names a
deliverable). Steps are paced backward from the due date. This is the deadline-
ambush answer.

**`pickFocus({ candidates, freeWindows, now }) → { taskId, reason }`**
Chooses the single card for **Start here** and returns one short sentence of
justification, shown on the card. Re-run on demand via *Not this one*, which also
excludes the rejected task for the rest of the day.

### 5.1 Cost and trigger discipline

Every call is user-triggered. Nothing runs on a timer, on page load, or in the
background. At realistic personal volume this is cents per month, and it means
there is never a surprise bill or a spinner the user did not ask for.

## 6. Interface

Four regions, left to right:

- **Everything** (rail) — the full backlog grouped by course, plus **Next two
  weeks**, a deadline list where anything ≤ 2 days away is in the alert color.
- **Start here** — exactly one card, deliberately larger and a different shape
  from every other card, showing the task, the AI's one-line reason, and its
  position in the parent breakdown (`step 2 of 4`). Below it, **Today's shape**.
- **Then** — the ordered queue, with the **cutline** drawn where the day runs out.
  Everything below the cutline is dimmed.
- **Done** — collapsed, struck through, low emphasis.

### 6.1 Today's shape

Two vertical tracks over real clock time: **Committed** (classes, work, calendar
events) and **Planned** (the queue laid end to end starting now). A solid line
marks the current time; a dashed alert line marks the day's hard edge. Any planned
block crossing that edge renders in the alert color.

This is the overcommitment answer. It re-lays live as cards move.

### 6.2 Motion

Springs, not transitions, for anything the user touches. Cards track the pointer
1:1 respecting the grab offset, then settle on a spring carrying release velocity
at `damping 0.88` / `response 0.4` — slightly under-damped, and only because a
throw preceded it. Non-gestural motion is critically damped (`damping 1.0`).
Everything else is a 150–250ms eased transition. Motion conveys state and nothing
else. Full parameters in `DESIGN.md`.

## 7. Error handling

The governing rule: **capture never fails.**

| Failure | Behavior |
|---|---|
| AI parse errors or times out (>4s) | Card is created from raw text with a local heuristic estimate, marked `fallback`. A quiet retry affordance sits on the card. Capture is never blocked |
| AI returns invalid schema | Same as above. Logged to `ai_log` with the raw response |
| Google token expired or revoked | Inline notice inside Today's shape only. Capacity falls back to the manual schedule and stays correct. Never a modal, never blocks the board |
| Calendar API 5xx / rate limit | Serve the last cache with its age shown. Do not retry aggressively |
| Offline | Captures queue in `localStorage` and flush on reconnect. The board stays readable and draggable |
| Empty board (first run, or everything done) | An empty state that teaches the one gesture that matters: type a sentence |

Nothing in this app is destructive enough to need a confirmation dialog. Deleting
a task is undoable via a toast.

## 8. Accessibility

WCAG 2.2 AA is the floor, verified rather than assumed, in **both** themes.

- Body text ≥ 4.5:1, large text ≥ 3:1. Contrast is asserted in tests, not eyeballed.
- Course identity is carried by a text label, never by hue. There is no color-coded
  course system to fail a color-blind user.
- Every drag has a keyboard equivalent: focus a card, press `1`/`2`/`3` to move it
  between lanes. The primary loop — capture, move, complete — is fully operable
  without a pointer.
- `prefers-reduced-motion: reduce` replaces springs and drag choreography with
  cross-fades. `prefers-reduced-transparency` solidifies the capture bar's
  gradient. `prefers-contrast: more` adds defined borders.

## 9. Testing

| Layer | What |
|---|---|
| Unit (pure) | `core/time`: free-window derivation across schedule edits, DST, overnight blocks, overlapping calendar events. `core/capacity`: totals, overage, cutline index, plan-track layout. These are the correctness core and they need no mocks |
| Contract | Zod validation of every AI response shape. A golden set of ~20 real sentences with expected parses, run against the live model on demand — this is the only honest measure of whether the core promise works |
| Component | Drag reorder, keyboard lane move, cutline repositioning, one-card invariant on `now` |
| Accessibility | Programmatic contrast assertions over the token set in both themes; a keyboard-only pass through the primary loop |
| End-to-end | Capture a sentence → card appears in Then → drag to Start here → capacity and timeline both update |

## 10. Scope

**In, v1:** capture with AI parse; the four-region board; drag and keyboard moves;
manual weekly schedule editor; Google Calendar read-only overlay; capacity, cutline,
and Today's shape; AI breakdown of large tasks; AI focus pick with reason; both
themes; password gate.

**Explicitly out.** Each of these was considered and cut:

- Notifications and reminders — an interruption budget this app has not earned yet.
- Gamification of any kind: XP, levels, streaks, confetti. Named as an
  anti-reference. It wears off by week three and makes abandonment worse.
- Writing back to Google Calendar.
- Native mobile app. The hosted URL works in a phone browser; that is enough.
- Multi-user, sharing, collaboration.
- Analytics dashboards about your own productivity.
- Recurring tasks. Revisit only if the real backlog demands it.

## 11. Open questions

None blocking. Two to settle during implementation, both reversible:

1. Whether **Today's shape** stays in the left column or moves into a slide-over.
   It earns its space today; if the board grows, revisit.
2. Whether `pickFocus` should offer one card or three candidates. Shipping one,
   because one is the answer to a cold start and three is another decision.

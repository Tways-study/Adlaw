> **Project:** Adlaw · **Doc:** Product PRD · **Version:** 2.1 · **Date:** 2026-08-17
> **Status:** Draft — 2 unresolved placeholders
> **Upstream:** `00-intake.md`, `PRODUCT.md`

# Product requirements

## Problem

Planners fail this user in a specific sequence. The day gets planned as a wish
list rather than a budget, so it is impossible before it starts. Facing an
impossible list, choosing what to do next costs more energy than doing it. Large
assignments sit as one undifferentiated card until the night before. After a few
days of this, the planner stops being opened.

Existing tools (Notion, Trello, paper) make the student do all the structuring
work. **The structuring work is the product.**

## Goal

One sentence in, a structured and time-aware plan out — and a day that pushes
back when it is overfull.

## Success criteria

| Criterion | Measure |
|---|---|
| Primary | Still opened in week six |
| Capture friction | Task captured in under 10 seconds, zero form fields |
| Parse quality | ≥ 80% of captures need no correction — measured against the `aiLog` table, not vibes |
| Honesty | The capacity figure is never wrong in a way the user has to discover |

`[[TBD: baseline for parse quality once ~50 real sentences exist in aiLog]]`

## Non-goals

Each was considered and cut for product reasons, not build-time convenience.
Re-proposing one needs a reason.

**Writing to Google Calendar** — a deliberate, separate decision about sync
direction (read-only avoids the hardest conflict-resolution problem in the app
for a benefit it doesn't need). Gamification of any kind (XP, levels, streaks,
confetti) · notifications and reminders · a native mobile app · sharing or
collaboration between accounts (multiple accounts exist as of
`00-intake.md`'s Amendment 3, but each is fully isolated — no feature lets one
see another's data) · productivity analytics about yourself · recurring
tasks · time tracking.

## Actors

**The student**, one per account, authenticated by Google or email/password
(`00-intake.md`'s Amendment 3 moved signup from one seeded account to
multi-user; Amendment 4 moved auth to Firebase and dropped the invite gate for
open signup — multiple students can each hold their own account, fully
isolated from one another). There is still no second *role*: every account is
the same kind of user, with no admin/viewer distinction. Any feature implying
a role split is out of scope by definition.

## Features — v1 (full scope, per 2026-08-17 amendment)

Every feature below ships in v1. Nothing here is deferred for build-time
convenience; see *Scope check* for the honest timeline consequence of that.

| # | Feature | Serves | Acceptance |
|---|---|---|---|
| M1 | **Capture.** One text field. A sentence becomes a task with inferred title, course, estimate, and due date | all four | Live parse preview while typing. Enter creates the card. If the model fails or exceeds 4s, the card is still created from raw text with a heuristic estimate and marked `fallback` |
| M2 | **Board.** Four regions: Everything, Start here, Then, Done | cold start | Cards move by drag and by keyboard. `Start here` holds at most one task, enforced server-side |
| M3 | **Weekly schedule.** Recurring blocks — classes, work, commute — entered once per semester | overcommit | Editing a block recomputes today's free windows immediately |
| M4 | **Capacity.** Free minutes remaining today vs minutes planned, with overage | overcommit | Derived on read from schedule blocks + calendar cache. Never stored. Never computed by the model |
| M5 | **Cutline.** A line drawn in the queue where the day runs out; everything below it dims | overcommit | Moves live as cards are added, removed, or reordered |
| M6 | **Today's shape.** Two tracks over clock time — committed (schedule + calendar) vs planned — with a now line and a day-edge line | overcommit | Planned blocks crossing the day edge render in the alert color |
| M7 | **Breakdown.** Large tasks split into ordered steps paced backward from the due date | ambush | Triggered when the parse flags `shouldSplit`, or on demand. Steps are schedulable; the parent is not |
| M8 | **Focus pick.** One card chosen for `Start here`, with a one-line reason shown on it | cold start | *Not this one* re-picks and excludes the rejected task for the rest of the day |
| M9 | **Complete.** Mark done and undo | — | Done shows only tasks completed today; older ones archive out of view automatically |
| M10 | **Horizon.** Deadlines for the next 14 days, with ≤ 2 days in the alert colour | ambush | Read-only list in the rail |
| M11 | **Themes.** Light, dark, auto | abandonment | Both independently tuned per `DESIGN.md`. Choice persists |
| M12 | **Access.** Multi-user, open signup | — | Firebase Auth — Google + email/password. No invite code as of Amendment 4; `docs/00-intake.md` |
| M13 | **Google Calendar overlay.** Read-only. Connect via OAuth, see events merged into Today's shape's committed track and into free-window derivation | overcommit | A **Sync now** action plus revalidation on page focus. Connect/disconnect from Settings. Board stays fully correct on the manual schedule alone if disconnected or if sync fails |
| M14 | **Inline edit.** Title, course, estimate, due date editable from the expanded card | — | No separate edit route |
| M15 | **Delete with undo.** ~6s undo toast, no confirmation dialog | — | Nothing here is destructive enough to need a modal |
| M16 | **Course management.** Add, rename, retire a course | — | Courses auto-create from parses; this is manual cleanup |
| M17 | **Offline capture queue.** Captures typed while offline queue in `localStorage` and flush on reconnect | abandonment | Board stays readable and draggable offline; only capture submission queues |
| M18 | **Config & review surfaces.** AI provider/model selection, Calendar connection status, an `aiLog` review list, full data export as JSON | abandonment (trust) | All in Settings, all real screens, not stubs. This is the "fully built and available" configuration surface the author asked for |

## Behavioural rules

Unchanged by the amendment — these are product decisions, not features, and
they're the ones most likely to be quietly violated regardless of scope.

- **Capture never fails.** No spinner, no modal, no blocked input, ever.
- **Every AI call is user-triggered.** Nothing on a timer, on page load, or in
  the background. Calendar sync is the same rule: user-triggered ("Sync now")
  plus focus-revalidation, never a polling background job.
- **Capacity math is deterministic.** The model never produces a number the
  interface presents as fact.
- **The day boundary is soft.** Nothing resets at midnight. Rolling forward
  stays a deliberate, explicit action, not automatic.
- **No confirmation dialogs.** Deletion is undoable via a toast.
- **Overcommitment is shown, never scolded.**

## Scope check

**18 must-have features, including OAuth, against 2–4 casual weeks — this does
not fit, and the honest thing to do is say so rather than quietly cut Calendar or
the config surfaces again.**

Rough sizing, using the build-order slices in `04-tdd.md` §Build order:

| Slice | Features | Rough effort |
|---|---|---|
| Skeleton (auth, Firebase, deploy) | M12 | 3–5h |
| Tasks + board | M1 (heuristic only), M2, M9, M15 | 8–12h |
| Movement | drag/keyboard/order (part of M2) | 4–6h |
| Time | M3, M4, M5 | 6–10h |
| Today's shape | M6 | 4–6h |
| Calendar | M13, including OAuth setup | 8–14h |
| AI | M1 (Gemini), M7, M8 | 6–10h |
| Config surfaces | M14, M16, M18 | 4–6h |
| Offline queue | M17 | 2–4h |
| Polish, empty states, deploy | — | 4–6h |
| **Total** | | **~49–79 hours** |

Against "2–4 weeks, evenings and weekends" (~25–40 hours), this is roughly
**1.5–2x the stated time budget.** Two honest paths, not a silent one:

1. **Extend the timeline** to 5–8 casual weeks and build the full list above in
   the documented slice order — each slice still ends with something usable.
2. **Keep the 2–4 week box** and accept that Calendar (M13) and the config/review
   surfaces (M18) land in a fast-follow immediately after, rather than in the
   same push as M1–M12. The board is fully functional and addresses all four
   failure modes without them.

Proceeding with the full v1 scope as directed, sequenced per `04-tdd.md`, with
this tension stated rather than hidden. This paragraph, not a cheerful "it all
fits," is the load-bearing sentence in this document.

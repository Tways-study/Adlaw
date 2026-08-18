> **Project:** Ledger · **Doc:** Design Brief · **Version:** 1.0 · **Date:** 2026-08-17
> **Status:** Draft
> **Upstream:** `01-prd.md`, `02-app-flow.md`, `PRODUCT.md`
> **Token authority:** `DESIGN.md`. Values are not restated here — this document covers intent, and `DESIGN.md` covers implementation

# Design brief

## The feeling

**A well-made object, quiet at rest.** Not a document, not stationery, not a game.
Surfaces have mass, edges catch light, things respond the instant they are pressed
and carry momentum when released. Physicality comes from material, depth, and
motion — never from props.

The emotional target is **relief, not motivation.** A student opening this at 11pm
should feel the day get smaller and more honest, not feel cheered at. Nothing here
congratulates, nags, or celebrates. It states what is true and gets out of the way.

Reference sensibility: Things 3 and Apple — generous space, soft depth, strongly
opinionated about what you don't see.

## What the design must accomplish

Each of the four ranked failures has a visual answer. These are the design's job,
not features bolted onto it.

| Failure | Visual answer | Why this and not a banner |
|---|---|---|
| Overcommitment | The **cutline** in the queue, the **capacity slot** in the header, and **red blocks crossing the day edge** in Today's shape | Three coordinated views of one fact. You see the day is impossible before anyone tells you |
| Cold start | **One focus card**, deliberately larger and a different shape from every other card, with a one-line reason | A board is a re-triage. One card is an answer |
| Deadline ambush | **Step progress** on the focus card (`step 2 of 4`), plus the 14-day **Horizon** in the rail | A large assignment stops being one opaque block |
| Abandonment | Zero-field capture, both themes tuned properly, no upkeep rituals | Every field, badge, and streak is a reason to stop opening it |

## Voice

Plain, specific, unsentimental. The interface says `2h 10m over` and
`4:00 — work starts`. It does not say "You're overbooked! 😅" or "Great job!"

- **Numbers over adjectives.** `1h 30m`, not "a while".
- **Name the real thing.** The cutline says what actually happens at 4:00 — a work
  shift — not "capacity reached".
- **No exclamation marks. No emoji. No second person cheerleading.**
- Empty states teach the one gesture that matters and nothing else.

## Colour intent

**Near-monochrome, one commitment.** Warm-toned neutrals carry the interface
(2026-08-18: adapted from Notion's system — see `DESIGN.md`), with one
saturated brand colour and one dedicated alert:

- **Blue** — committed, planned, complete, selected.
- **Red** — past the edge of the day. Nothing else, ever.

A wider reserved accent cast exists in the token set for possible future
decorative use, but is never wired into UI chrome or a functional signal —
the interface itself still reads as a two-colour system in practice. There is
still **no per-course colour system**. Courses are text labels. A rainbow of
course tags is the obvious move and it is wrong here: it fails colour-blind
users, it competes with the only two signals that carry meaning, and it turns
a calm board into a chart.

Light and dark are independently tuned, not inverted. Dimming that reads correctly
on white destroys legibility on a dark ground, which is why `.past` opacity differs
per theme by design.

## Typography intent

Two families: **Inter** for UI, and **Source Serif 4** reserved for exactly
one moment — the AI's one-line reason on the focus card, the interface's one
piece of written, human-register voice. It is a system accent, not a parallel
hierarchy; it never appears in a button, a label, or a data value.

Hierarchy comes from weight, size, and leading as a set. Tracking is size-specific:
tighten as size grows, near zero at body. Every duration, count, and clock time is
tabular so columns don't shimmer as they update — this app shows changing numbers
constantly, and jitter reads as carelessness.

## Motion intent

Motion conveys state. It is never decorative, and there is no page-load
choreography — the board loads into a task.

Springs for anything the user touches, because a spring can be interrupted and
redirected mid-flight and a keyframe cannot. Feedback fires on pointer-down, not on
release. Drag tracks 1:1 from wherever the card was grabbed.

`prefers-reduced-motion` gets a genuine alternative, not a disabled feature.

## Card hierarchy

Cards are not one rectangle repeated. Shape encodes role:

- **Focus card** — largest radius, largest type, carries the parent breakdown and
  actions. Exactly one exists.
- **Queue card** — compact. Course, title, duration, due hint.
- **Done card** — no shadow, no fill, hairline separator, struck through. Present
  but almost weightless.

## Accessibility as a design constraint

Not a compliance pass afterward — these shape the visual system:

- Body text ≥ 4.5:1 in **both** themes, asserted in tests. The muted-grey-for-elegance
  reflex is the single most common way this system breaks.
- Course identity never carried by hue. This is why courses are text labels.
- Every drag has a keyboard equivalent; the primary loop is fully operable without
  a pointer.
- `prefers-reduced-motion`, `prefers-reduced-transparency`, and
  `prefers-contrast: more` all handled.

## Explicitly out

Skeuomorphic props (paper texture, tape, coffee stains, pins, rotation jitter) ·
colored side-stripe borders on cards · shadows on resting content cards · gradient
text · decorative glassmorphism · hero-metric tiles · uppercase tracked eyebrows
above every section · per-course colour tags · gamification surfaces of any kind ·
nested cards · display/serif fonts outside the focus card's reason line.

An earlier draft of this interface was rejected for the first three. `DESIGN.md`
carries the full ban list and the reasoning.

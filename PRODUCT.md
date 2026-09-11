# Product

## Register

product

## Users

One person: a student, using their own laptop. No accounts, no sharing, no
onboarding for strangers. They open it in two contexts that both matter — late at
night in a dim room deciding what still has to happen, and in daylight between
classes on a washed-out screen.

**2026-09-11 amendment — dark-only.** The design direction moved to the Linear
reference (`DESIGN.md`), which defines a single dark theme, and the author
chose to follow it strictly: there is no light theme and no theme toggle. The
daylight context above still matters, and it is served by contrast rather than
by a second theme — every text pairing clears WCAG AA with margin, asserted in
`ui/tokens.contrast.test.ts`, so a washed-out screen still reads.

The job to be done, in their words: *"tell me what to start, and stop me from
planning a day that was never possible."*

## Product Purpose

A daily planner that takes one sentence per task and does the structuring work
itself — inferring course, effort, deadline, and the steps a big assignment
breaks into. It holds a finite day: the surface has a capacity derived from a
manually-entered class schedule plus a read-only Google Calendar overlay, and
planning past that capacity is visible, not silent.

Four failures it exists to prevent, named by the user:

1. **Overcommitment** — planning ten things into a day that fits four.
2. **Cold start** — freezing because deciding what to do next costs more than
   the task.
3. **Deadline ambush** — a large assignment sitting as one undifferentiated card
   until the night before.
4. **Abandonment** — beautiful setup, four days of use, silence. This is the
   meta-failure; every other decision is downstream of it.

Success is narrow and behavioral: it is still open in week six.

## Brand Personality

Calm, physical, honest.

It behaves like a well-made instrument rather than a document — surfaces have
depth and precise edges; things respond on press, track the pointer 1:1, and
carry momentum when released. The tone is a good tool's tone: it states what is
true (*"this day is 1h45 over"*) without scolding, celebrating, or gamifying. No
streaks, no confetti, no XP.

It is quiet at rest and expressive only under the hand.

## Anti-references

The visual language (`DESIGN.md`, 2026-09-11) strictly follows Linear's
design system — a considered choice, not an oversight. That makes this list
about specific *props and patterns*, not about resembling a productivity tool.
"Notion/Trello as-is," below, is still in force for a different reason — the
generic-container information architecture, not the look of the surface.

- **Cozy stationery skeuomorphism.** Coffee rings, washi tape, torn paper,
  rotation jitter, parchment textures. Props are not craft. Physicality must come
  from material, depth, and motion.
- **Colored side-stripe borders** on cards and list items.
- **Gamification.** XP, levels, streak flames, quest framing. It wears off by
  week three and the abandonment problem gets worse, not better.
- **Generic SaaS dashboard grammar.** Gradient text, hero metric tiles, uppercase
  tracked eyebrows over every section, endless identical card grids.
- **Notion / Trello as-is.** Generic containers that make the student do all the
  structuring work. The structuring work is the product.

## Design Principles

1. **The surface is finite, and you can see the edge.** Capacity is a physical
   property of the day, not a warning banner. Overcommitment is legible in the
   layout before it is stated in words.
2. **One sentence in, structure out.** Every field the interface asks for is a
   reason to abandon it. The AI earns its place by removing input, not by adding
   intelligence on top of forms.
3. **Answer the cold start with a single card.** "What do I start" gets one
   confident answer at a glance, not a board to re-triage.
4. **Physicality lives in material and motion, never in props.** Depth, weight,
   1:1 tracking, momentum on release. Nothing decorative that doesn't respond.
5. **Quiet at rest.** Motion conveys state and nothing else. The tool disappears
   into the task.

## Accessibility & Inclusion

- WCAG 2.2 AA as the floor: body text ≥ 4.5:1, large text ≥ 3:1, in the dark
  theme (the only theme). Verified, not assumed — `ui/tokens.contrast.test.ts`.
- Course identity is never carried by hue alone — always paired with a text
  label, since color-blind-safe distinction across many courses is not achievable
  with color alone.
- `prefers-reduced-motion: reduce` replaces spring and drag choreography with
  cross-fades; drag-and-drop always has a keyboard and menu equivalent, because a
  board that only responds to dragging is unusable without a pointer.
- `prefers-reduced-transparency` and `prefers-contrast: more` supported: solid
  surfaces, defined borders.
- Full keyboard operation for the primary loop — capture a task, move a card,
  complete a card — without touching the mouse.

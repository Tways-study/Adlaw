# Kanban Daily Planner

A single-user daily planner that turns one typed sentence into a structured
task, and holds the day to a finite, visible capacity.

## Language

### Tasks and steps

**Task**:
A single unit of work captured from one sentence of input, holding a title,
estimate, optional course, and optional due date. Moves through the lifecycle
`shelf → next → now → done`.
_Avoid_: card, item (fine for the UI representation, not the domain concept)

**Step**:
A Task whose `parentId` points at another Task — one piece of a Breakdown.
Steps carry `stepIndex` and are the only rows in a broken-down group that are
ever schedulable or shown in a lane.
_Avoid_: subtask, child task

**Parent task**:
A Task that has been broken down into Steps. Once it has Steps it becomes
inert — never schedulable, never shown in a lane — and its own `estimateMin`/
`dueAt` are vestigial; only its Steps carry live values.
_Avoid_: container task, group task

### Lifecycle and lanes

**Status** (`shelf` / `next` / `now` / `done`):
The four-state lifecycle every Task moves through. `shelf` (UI: **Everything**
rail) — captured, not queued for today. `next` (UI: **Then** queue) — queued
for today, ordered, where the cutline is drawn. `now` (UI: **Start here**) —
the single active Task; at most one at a time, enforced in the mutation layer.
`done` (UI: **Done** lane) — completed today, filtered to today only.
_Avoid_: treating the UI region names as concepts separate from the status —
they're presentation labels for the same four states, not a parallel taxonomy.

### Time and capacity

**Free window**:
An interval of a given day not committed to a schedule block or calendar
event. Computed by merging schedule blocks and calendar events, inverting
against the day, and clipping to `[now, dayEnd]`.
_Avoid_: gap, open slot

**Capacity**:
The derived totals — total planned minutes, overage, cutline index, and
per-task plan blocks — computed from free windows and the ordered task queue.
Refers to the numbers, not the visual that renders them.
_Avoid_: using "capacity" to mean the whole finite-day feature or the Today's
shape visual — those are separate terms below.

**Cutline**:
The index into the ordered `next` queue marking where the day's free time
runs out. An index into the queue, not a clock time — it visually lines up
with a moment in Today's shape but is not itself a timestamp.
_Avoid_: describing it as a time value.

**Today's shape**:
The timeline visualization of the current day: a **Committed track** (schedule
blocks and calendar events already fixed) and a **Planned track** (the task
queue laid out end-to-end from the current time, positioned by capacity's
plan-track layout).
_Avoid_: "plan-track" as a standalone concept — it's the Planned track's
layout, an implementation detail of Today's shape.

**Horizon**:
The read-only 14-day deadline list shown in the Everything rail; entries due
within 2 days render in the alert color.

### AI and parsing

**Focus pick**:
The AI action that recommends which Task should be promoted to `now`, with a
one-line reason. Always user-triggered — never runs automatically on board
load or a timer.
_Avoid_: implying it fires automatically; "auto-promote"

**Not this one**:
Dismissing a focus pick excludes that specific Task from future picks until
the end of the current day. The Task stays visible and schedulable in its
lane throughout — only its eligibility for focus picks is suspended, and it
resets the next day.

**parseState** (`ok` / `fallback` / `failed`):
Records how a Task's structured fields were produced. `ok` — the AI parse
succeeded. `fallback` — the AI failed or timed out; the heuristic parser
produced the estimate instead. This is the guaranteed, non-blocking path:
capture never fails. `failed` is reserved for a defensive case not reachable
in v1, since heuristic parsing is pure and always produces a result.
_Avoid_: treating `failed` as a currently-reachable state.

### Courses

**Course**:
A text-label grouping for Tasks (e.g. "BIO 210"), auto-created on first
sighting during parse. `active: false` archives it — it drops out of pickers
and grouping, but Tasks already pointing at it keep their reference. The
label can be edited in place at any time; there is no merge operation in v1.
_Avoid_: implying courses carry color identity — they never do.

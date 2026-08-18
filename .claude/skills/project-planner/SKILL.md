---
name: project-planner
description: "Plan a software project end to end before any code is written: interrogate the idea, choose the stack and language with justified tradeoffs, and produce the founding document set — Product PRD, TDD (Technical Design Document), Design Brief, App Flow, and Backend Schema. Use this skill whenever the user is starting, scoping, or re-scoping a project and asks things like 'what stack should I use', 'help me plan this app', 'write a PRD', 'design the database schema', 'make the technical design doc', 'outline this project', 'what should I build this in', or hands over a rough idea, a capstone proposal, or a client brief and wants it turned into a buildable plan. Also use it when the user wants only one of these documents, when they want an existing plan audited for gaps or contradictions, or when they mention CodeGuide-style or AI-coding-agent starter docs."
---

# Project planner

A project fails at planning time in ways that are invisible until month three: the schema
can't express a feature the PRD promised, the stack was chosen for the resume rather than
the constraint, and the "MVP" contains four things that are each a semester of work.

This skill exists to make those failures visible on day one, while they are still cheap.

Two things distinguish a plan worth having:

1. **The stack decision is derived from constraints, not preference.** A planner that
   always answers "Next.js + Supabase" is a template, not a plan. The value is knowing
   when that default is wrong.
2. **The documents agree with each other.** The most common defect in AI-generated
   project docs is a PRD promising offline sync, an app flow with no conflict-resolution
   screen, and a schema with no version column. Cross-consistency is the deliverable.

## The document set and why it is ordered

Each document consumes the one before it. Generating them out of order produces documents
that contradict each other, so follow the dependency chain even when the user asks for
only one artifact — you may need to derive an upstream document silently to write a
downstream one correctly.

| # | Document | Answers | Depends on | Reference |
|---|---|---|---|---|
| 00 | Intake & constraints | What is actually true about this project | User answers | `references/intake.md` |
| 0 | Stack decision | What are we building this in, and why | Intake | `references/stack-selection.md` |
| 1 | Product PRD | What are we building and for whom | Intake | `references/prd.md` |
| 2 | App Flow | What screens and states exist | PRD | `references/app-flow.md` |
| 3 | Backend Schema | What data is persisted and who may read it | PRD + App Flow | `references/backend-schema.md` |
| 4 | TDD | How the system is built and why that way | All above | `references/tdd.md` |
| 5 | Design Brief | What it looks and feels like | PRD + App Flow | `references/design-brief.md` |

Read only the reference files you need for the documents being produced. Read
`references/stack-selection.md` for any plan — the stack decision leaks into every other
document.

**Disambiguate TDD on first use.** In this document set TDD means *Technical Design
Document*. If the user's phrasing suggests *test-driven development* ("write TDD tests",
"do TDD for this module"), that is a different request — confirm before producing a
design document they did not ask for.

## Step 0 — Intake (gate: do not generate documents before this closes)

**This is a hard gate.** Do not produce a PRD, schema, stack recommendation, or any other
document until intake has closed. A plan generated from an unstated assumption is worse
than no plan, because it looks authoritative and the assumption becomes invisible the
moment it is formatted into a table.

The failure to avoid on the other side is interrogation: a drip of one question per turn
until the user gives up. Both failures are avoided the same way — extract everything
available first, ask everything remaining at once, then reflect the analysis back for
correction in a single pass.

Read `references/intake.md` for the question bank, inference rules, and contradiction
table. Run these four phases in order.

### Phase A — Extract before asking

Mine every available source before writing a single question: the current conversation,
any uploaded proposal, brief, chapter, or repo, and any project context already
established. Asking a user something they told you two messages ago is the fastest way to
lose their confidence in the rest of the output.

Produce an internal ledger of *known* / *inferred* / *unknown* for every intake dimension.
Only genuine unknowns become questions.

### Phase B — Ask once, in one block

Ask every remaining question in a single message. If an interactive input tool is
available in the environment, use it — tappable options beat typing, especially on mobile.
Otherwise ask as a short numbered list.

Constraints on the question set, which exist because they are what make the block
answerable rather than abandoned:

- **Six questions maximum.** If more than six things are unknown, the highest-value
  question is "walk me through what you're building" — ask that alone and re-extract.
- **Every question must change an output.** If both answers lead to the same plan, the
  question is curiosity, not intake. Drop it.
- **Offer concrete options,** not open prompts. "Deadline: under 6 weeks / one semester /
  6+ months / none" gets answered; "what's your timeline?" gets "soon".
- **Show what you already inferred** in the same message, so the user corrects rather than
  re-types.
- **No feature questions yet.** Features are Step 2. Asking early produces a wishlist that
  anchors scope before the constraints that should have bounded it are known.

Close the block by naming the gate explicitly — that you will summarise your understanding
before generating anything — so the user knows one more checkpoint is coming and does not
over-answer.

### Phase C — Analyze automatically

This is the phase that distinguishes intake from a form. When the answers arrive, do not
proceed straight to drafting. Run the analysis in `references/intake.md`:

1. **Derive consequences.** Every constraint gets its architectural consequence computed,
   not just recorded. This produces the Step 1 constraint table automatically.
2. **Detect contradictions in the user's own answers.** Free-tier budget with realtime
   collaboration, offline-first with server-enforced authorization, a 12-week deadline
   with 20 must-have features, an app-store launch with no budget. Users hold each of
   these sincerely and cannot see the collision. Surfacing it here costs a sentence;
   surfacing it in month three costs the project.
3. **Flag the load-bearing unknowns.** Distinguish an unknown that changes the stack from
   one that only fills a table cell. The first blocks; the second becomes `[[TBD: ...]]`.
4. **Infer the unasked.** Data sensitivity usually follows from the user description;
   scale usually follows from the population. State these as inferences to be corrected,
   not as facts.

### Phase D — Reflect back, then wait

Post an understanding check and **stop for confirmation**. Do not generate documents in
the same turn.

```markdown
## Understanding check — correct anything wrong before I build

**Building:** <one sentence, in your words>
**For:** <primary user> · **Because:** <what breaks today>

| Dimension | Value | Source | Consequence |
|---|---|---|---|
| Deadline | 14 weeks | you said | No custom auth, no self-hosted infra |
| Team | 3 devs | you said | One language across the stack |
| Data | Student PII | inferred from "campus attendance" | RLS mandatory, PH region |
| Scale | ~800 users | inferred from "one department" | Postgres alone; no cache layer |

⚠️ **Tension:** free-tier hosting and the live dashboard you described compete for the
same connection limits. Options: poll every 30s (free), or budget for realtime.
❓ **Blocking:** does this need to work without internet? It decides the entire data
layer and I cannot pick a stack without it.
📝 **Will placeholder:** exact user count, launch date.

Reply with corrections, or "go" and I'll build the document set.
```

The tension and blocking lines are the value. A user who reads their own project back with
one collision named will correct something — and that correction is worth more than any
document generated without it.

### When to relax the gate

Skip Phase B and go straight to C and D when the user has already supplied enough — a full
proposal, a manuscript, a detailed brief — or has explicitly asked for speed ("just draft
it", "I don't have time for questions"). The understanding check in Phase D is never
skipped; it becomes the single correction point, and every inference in it gets marked as
an inference.

### Placeholders

Never invent user counts, latency targets, budgets, compliance requirements, or metrics.
Where a number is needed and unknown, write an explicit token — `[[TBD: expected peak
concurrent users]]` — and list every placeholder in the handoff message. An invented
performance budget is worse than a missing one, because it will be treated as a
requirement.

## Step 1 — Persist the constraint table

The constraint table falls out of Phase C. Write it to `docs/00-intake.md` as the first
document, not just into the conversation — every downstream document and every coding
agent the user points at this project needs to read the constraints without replaying the
chat. Each subsequent document cites it as upstream.

```markdown
| Constraint | Value | Architectural consequence |
|---|---|---|
| Deadline | 14 weeks (defense Mar 12) | No custom auth; no self-hosted infra |
| Team | 3 devs, 1 part-time on UI | Single language across stack |
| Budget | Free tier only | Rules out always-on workers, managed queues |
| Data | Student PII, campus scope | RLS mandatory, audit trail, PH region |
| Scale | ~800 users, ~40 concurrent | Postgres alone is sufficient; no cache layer |
| Offline | Not required | No sync engine, no CRDT, no local-first DB |
```

The right-hand column is the entire point. A constraint with no stated consequence has
not been thought about — either fill it in or drop the row.

## Step 2 — Choose the stack

Read `references/stack-selection.md`. Produce a recommendation that names the default,
names the plausible alternative, and says what would have to be true for the alternative
to win. A recommendation with no losing candidate is a preference wearing a suit.

Output shape:

```markdown
## Stack decision

**Recommendation:** <stack, one line>

| Layer | Choice | Alternative considered | Why the alternative loses here |
|---|---|---|---|
| ... | ... | ... | ... |

**What would change this decision:** <the specific constraint flip that reverses it>
```

The last line matters more than it looks. It tells the user which assumption to watch,
and it is the first thing to revisit when the project inevitably changes shape.

## Step 3 — Generate documents in dependency order

Produce each document as a separate Markdown file, not one wall of text. The user will
feed these to coding agents, hand them to teammates, and diff them across revisions —
all of which want discrete files.

Suggested layout:

```
docs/
├── 00-intake.md           (constraints, confirmed answers, open questions)
├── 00-stack-decision.md
├── 01-prd.md
├── 02-app-flow.md
├── 03-backend-schema.md   (+ 03-schema.sql if DDL is substantial)
├── 04-tdd.md
└── 05-design-brief.md
```

Each document opens with a three-line header so a reader landing cold knows what they
have:

```markdown
> **Project:** <name> · **Doc:** PRD · **Version:** 0.1 · **Date:** <date>
> **Status:** Draft — contains N unresolved placeholders
> **Upstream:** <documents this one depends on>
```

**Unknowns discovered mid-generation.** Drafting surfaces questions intake could not have
predicted — a state machine needs a rule nobody specified, a schema needs to know whether
deletions are recoverable. Two responses are acceptable: write `[[TBD: ...]]` and carry it
into the handoff, or stop and ask if the answer changes the architecture rather than a
cell. Inventing a plausible answer is not one of them; it is indistinguishable from a
requirement in the finished document.

## Step 4 — Consistency pass

This is the step that distinguishes a plan from a pile of documents. After generating
everything, verify each claim below and report the result explicitly. Do not skip it and
do not report it as passing without actually checking.

- **Every PRD feature has a home.** Each must-have feature maps to at least one screen in
  the app flow and at least one table or column in the schema. Name the orphans.
- **Every table is reachable.** A table no flow reads or writes is either dead weight or
  evidence of a missing feature.
- **Every state has an exit.** Each state machine has a terminal state and a path out of
  every error state.
- **Every role has a policy.** Each actor in the PRD appears in the RLS policy set. A role
  with no policy either cannot use the system or can read everything.
- **The stack can do what was promised.** Realtime, offline, background jobs, file size
  limits, cron frequency — check the promised capability against the chosen platform's
  actual free-tier limits, not its marketing page.
- **Scope fits the timeline.** Count must-have features against weeks and team size. If it
  does not fit, say so in the handoff with a specific cut list. This is the most valuable
  sentence in the entire deliverable and the one most often omitted.

Report as:

```markdown
## Consistency check
✅ 14 features → 11 screens → 9 tables, no orphans
⚠️  PRD promises offline capture; no sync conflict handling in app flow (§3.2)
⚠️  `notification_log` written by no flow — dead table or missing feature?
🔴 23 must-have features / 14 weeks / 3 devs — cut list proposed in handoff
```

## Step 5 — Handoff

Close with a short message containing, in this order: the file list, every unresolved
placeholder, every consistency warning, the recommended first build slice, and the one
decision most likely to be wrong. Keep it under a page. The user is about to start
building, not reading.

## Auditing an existing plan

If the user brings existing documents rather than an idea, skip Steps 1–3 and run Step 4
against what they have, then propose targeted patches. Do not rewrite documents wholesale
to fix a localized gap — a plan the team has internalized has value that a cleaner
rewrite destroys.

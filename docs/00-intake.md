> **Project:** Ledger · **Doc:** Intake & Constraints · **Version:** 1.2 · **Date:** 2026-08-17
> **Status:** Confirmed — 4 unresolved placeholders
> **Upstream:** conversation of 2026-08-17, `PRODUCT.md`, `DESIGN.md`, `docs/superpowers/specs/2026-08-17-kanban-daily-planner-design.md`

# Intake & constraints

## What this is

A single-user daily planner for one student. You type one plain sentence; it
becomes a structured card with an inferred course, effort estimate, deadline, and
— for large assignments — an ordered set of steps. The day has a finite capacity
derived from a manually-entered weekly class schedule plus a read-only Google
Calendar overlay, and planning past that capacity is visible in the layout rather
than announced in a banner.

**For:** the author, a student.
**Because:** they plan ten things into a day that fits four, freeze on what to
start, get ambushed by deadlines, and abandon planners by week two.

## Amendment — 2026-08-17, later same day

The author directed: build the full feature set and expose full configuration,
**disregarding the earlier scoping-for-skill-level constraint.** This reverses two
decisions made in v1.0 of this document:

- The **"who builds" constraint no longer discounts a technically stronger option
  in favor of a lower-friction one.** Component choices below are made on merit,
  with setup/learning cost noted but not decisive.
- **Google Calendar moves from deferred to v1.** It was cut for setup cost
  (OAuth, a Google Cloud project), not for product reasons — the original design
  spec always intended it, just read-only.

**What did not change,** because it was never about skill level: zero budget
(still true, still rules out paid AI), single user / single password (still the
product), no writing to Google Calendar (an earlier, separate decision about sync
direction — see the design spec), and the entire visual system in `DESIGN.md`.

**Consequence not to paper over:** the 2–4 week estimate in the row below was
sized against the smaller, skill-scoped build. Full scope is a bigger build. See
*Scope risk*.

## Amendment 2 — 2026-08-17, later still

The author's Supabase account hit its free-project limit — not a skill or scope
issue, an infrastructure-availability one. The author directed a swap to
**Convex** for the data layer, reverting `00-stack-decision.md` to its original
v1.0 pick. This is not a walk-back of Amendment 1: full v1 scope (Calendar,
config surfaces) stands unchanged. See `00-stack-decision.md` v3.0 for the full
reasoning, including why the auth mechanism also had to change (Convex Auth's
password provider, not a hand-rolled cookie) as a real consequence of Convex's
client-calls-functions-directly model rather than a preference.

## Constraints

| Constraint | Value | Source | Architectural consequence |
|---|---|---|---|
| Timeline | 2–4 weeks stated, **now optimistic against full scope** | stated | See Scope risk — flagged, not silently absorbed |
| Who builds | Author is new to full-stack; agent drives. **Not a scoping constraint as of the amendment** | stated, amended | Components chosen on technical merit. Setup/learning cost documented per choice, not avoided |
| Budget | Zero | stated | Free tiers only. Rules out paid LLM APIs, always-on workers, managed queues |
| AI provider | Google Gemini, free tier | stated | Schema-constrained JSON output. Rate-limited per minute/day — fine at one user. Free-tier content may be used for product improvement; accepted knowingly |
| Accounts held | Vercel, Supabase (blocked — free-project limit reached) | stated | Supabase unused as of Amendment 2. New: Convex, Google Cloud project for Calendar OAuth, AI Studio key |
| Google Calendar | **In v1**, read-only overlay | amended | OAuth flow, encrypted refresh-token storage, a sync cache table, a connect/disconnect screen |
| Users | 1 | stated | No RLS in the Supabase-product sense, no roles, no sharing, no multi-tenancy. A single shared password gates the whole app |
| Data sensitivity | Author's own coursework titles | inferred from description | No third-party PII, no regulated data, no compliance surface, no residency requirement |
| Scale | ~40 live tasks, ~1 session/day | inferred from single user | Every candidate database is over-specified. Postgres is chosen for fit with the held account and the relational shape of the data, not for scale |
| Offline | Not required | spec §7 | No sync engine, no CRDT, no local-first database. `localStorage` capture queue only |
| Platform | Web, laptop-first, phone browser usable | stated | No native app, no app store, no push notifications |
| Config surfaces | **Fully built and available**, not hidden or deferred | amended | AI provider/model selection, Calendar connect status, `aiLog` review, and data export are all first-class Settings screens in v1, not admin-only or future work |
| Design system | Complete and approved | `DESIGN.md` | Tokens, type scale, elevation, motion, and ban list are settled. Not re-litigated during build |

## Ranked failure modes

Unchanged by the amendment. The product exists to prevent these, in this order.
When two design choices conflict, the higher-ranked failure wins.

1. **Abandonment.** Set up beautifully, used four days, then silence.
2. **Overcommitment.** Ten things planned into a day that fits four.
3. **Cold start.** Freezing because choosing costs more than doing.
4. **Deadline ambush.** A large assignment sitting as one undifferentiated card.

## Tensions surfaced and resolved

| Tension | Resolution |
|---|---|
| Full feature/config scope vs a 2–4 week casual timeline | **Not resolved by fiat.** Documented honestly in `01-prd.md` §Scope check with a real build-order estimate. Proceeding at the author's direction; the timeline is the thing most likely to move, not the scope |
| Zero budget vs an AI-dependent core promise | Gemini free tier, behind a provider-agnostic adapter. Heuristic parser ships as the permanent fallback, not a placeholder |
| "Personal tool" simplicity vs hosted infrastructure + OAuth | Hosting and Calendar both stand. An app you must start from a terminal, or one whose capacity is wrong because it can't see your calendar, is an app you stop opening — and abandonment is failure mode #1 |
| Single-user product vs a real identity system | Resolved differently depending on the data layer — under Postgres (v2.0), the client had no DB access at all, so a hand-rolled cookie sufficed. Under Convex (v3.0, current), the client calls functions directly, so Convex Auth's password provider (one seeded account, no signup flow) is the actual requirement, not a preference |

## Scope risk

**Full scope (18 features, including Google Calendar OAuth) against a stated
2–4 casual weeks does not fit.** Stating this plainly is the point of this
document — see `01-prd.md` §Scope check for the honest build-order estimate and
the two ways to reconcile it (extend the timeline, or accept the documented
slice order and let it run longer). Not cutting Calendar or the config surfaces
silently to make the number look right.

## Placeholders

- `[[TBD: Google AI Studio API key]]` — author will supply before the AI adapter
  is wired. Heuristic path is fully functional without it.
- `[[TBD: author's actual weekly class schedule]]` — needed to *use* the app, not
  to build it. Seeded with fixture data during development.
- `[[TBD: Google Cloud OAuth client ID/secret]]` — needed for Calendar. Setup
  steps are in `00-stack-decision.md`.
- `[[TBD: Convex deployment]]` — created via `npx convex dev` at scaffold time.
  No manual setup beyond running that command.

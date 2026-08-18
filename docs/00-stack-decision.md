> **Project:** Ledger · **Doc:** Stack Decision · **Version:** 3.0 · **Date:** 2026-08-17
> **Status:** Final — supersedes v2.0 (Postgres/Supabase), which itself superseded v1.0 (Convex). See amendment in `00-intake.md`
> **Upstream:** `00-intake.md`

# Stack decision

**Recommendation:** Next.js (App Router) on Vercel · **Convex** for data, server
functions, and auth · Convex Auth (password provider, one seeded account) ·
Google OAuth for Calendar read access, exchanged in a Convex HTTP action ·
Google Gemini (free tier) behind a provider-agnostic adapter · hand-written CSS
from `DESIGN.md` tokens.

## Why this changed twice

v1.0 chose Convex, discounted for a beginner-friction argument that the author
later told me to disregard. v2.0 reverted to Postgres/Supabase on merit — the
account was already held and the data is genuinely relational. **v2.0's own
justification broke**: the author is out of free Supabase projects. With that
gone, Convex's original advantage (schema and functions in one TypeScript file,
no migrations, no connection pooling, live-reactive queries for free) is real
again and uncontested. This is an infrastructure-availability decision, not a
scope decision — Calendar-in-v1 and the full config surfaces from the earlier
amendment are unaffected and unchanged.

| Layer | Choice | Alternative considered | Why the alternative loses here |
|---|---|---|---|
| Framework | Next.js App Router | Vite + React SPA | Next gives one deploy target; Convex functions are called from either client components or route handlers without a second server |
| Hosting | Vercel | Netlify, Cloudflare Pages | Account already held. No technical differentiator at this scale |
| Data + server | **Convex** | Postgres (Neon, Supabase) | Supabase is blocked (free-project limit reached). Neon would work but reintroduces a schema file, migrations, and a connection string for no longer-necessary reason. Convex needs none of that and gives reactive queries for free — the board updates live with no manual revalidation logic |
| Auth | **Convex Auth**, password provider, one account | Hand-rolled password → signed cookie (the v2.0 choice) | The v2.0 reasoning ("client never touches the DB directly, so no identity product is needed") doesn't hold for Convex — the client calls Convex functions directly for live queries, so those functions need a real identity to check via `ctx.auth`. Convex Auth's password provider is the smallest thing that provides one |
| Calendar | Google OAuth (`calendar.readonly`), token exchange in a **Convex HTTP action** | A Next.js API route doing the exchange, then calling Convex | Convex HTTP actions get a public URL (`*.convex.site`) and can be the OAuth redirect target directly — one fewer hop, one fewer place the flow can break |
| AI | Google Gemini, Flash-tier, free | Anthropic, OpenAI, a Python NLP service | Unaffected by this swap. See *Alternative considered and rejected: a Python parsing service* below — that reasoning is unchanged by moving off Postgres |
| Schema validation | Zod | Convex validators alone | Convex validates its own function arguments; Zod is still needed for the *model's* JSON output, which is untrusted regardless of database |
| Data fetching | **Convex live queries** (`useQuery`), reactive by default | Server Actions + SWR revalidation (the v2.0 approach) | This is the thing v2.0 gave up and gets back. No manual `revalidatePath` calls, no focus-revalidation logic — a mutation from any tab updates every mounted query automatically |
| Styling | Hand-written CSS, `DESIGN.md` tokens | Tailwind, shadcn/ui | Unaffected. The visual system is already fully specified |

## Alternative considered and rejected: a Python parsing service

Unchanged by this swap — the reasoning was about the AI/parsing layer, not the
database, and applies identically on Convex.

**Not implemented.** The idea: replace or augment the heuristic/Gemini
text-to-fields step with a Python service (`spaCy`, `dateparser`), likely as a
separate FastAPI deployment.

**Why it loses:** it's a second runtime and a second deploy target for a
single-user, zero-ops project — the exact thing this document keeps optimizing
against. It would mostly duplicate what Gemini's schema-constrained,
Zod-validated JSON output already does for short informal task descriptions. The
existing two-layer split (`core/heuristic.ts` offline-always, Gemini on submit)
already covers the "no network / no key" case.

**What would change this:** real evidence in `aiLog` of a specific parsing
pattern (most plausibly relative dates) failing often. Try better prompting or
more heuristic rules first, in the same language and deploy, before reaching for
a second service.

## How access control works without a Postgres-style boundary

Convex has no RLS-equivalent and no concept of a service-role key holding the
line between client and database — the client talks to Convex directly. The
actual boundary is:

- **Convex Auth's password provider** issues a real session; every query and
  mutation starts with `const identity = await ctx.auth.getUserIdentity()` and
  throws if it's absent.
- **There is still only one account**, created during setup, not through a
  public signup flow — Convex Auth supports this without needing a signup UI at
  all; the account is seeded directly.
- With one user, there is no per-row ownership to check and no policy set to
  write. This is the same conclusion v2.0 reached about RLS, arrived at through
  Convex's actual security primitive instead of Postgres's.

## What would change this decision

- **A second user joins, or this stops being a personal tool.** Then real
  multi-user authorization becomes a requirement either way — Convex Auth
  already supports multiple providers/users, so this is a smaller lift here than
  it would have been retrofitting RLS onto the Postgres plan.
- **Convex's free tier becomes insufficient**, or the author gets a working
  Postgres provider again and prefers SQL. Revert is possible but not free —
  see *Migration note* below.
- **Gemini's free tier stops covering the volume.** Swap the adapter. Unrelated
  to this decision, unaffected by it.

## Migration note

This is the second data-layer reversal. If a third one happens, the module
boundary in `04-tdd.md` (`core/` stays pure, provider-agnostic `ai/`) is what
makes each swap a bounded, mechanical change rather than a rewrite — the parts
that are actually hard (capacity math, the cutline, free-window derivation)
have never moved and aren't touched by any of these swaps.

## Services to create

| Service | Status | Needed for |
|---|---|---|
| Vercel | ✅ held | Deploy |
| Convex | ⬜ new, free | Data, server functions, auth, Calendar OAuth callback |
| Google AI Studio | ⬜ new, free — `[[TBD: API key]]` | Gemini adapter. Heuristic path works without it |
| Google Cloud project | ⬜ new, free — `[[TBD: OAuth client ID/secret]]` | Calendar OAuth consent screen and credentials |
| Supabase | ✅ held, **unused** | Blocked on free-project limit; superseded by Convex |

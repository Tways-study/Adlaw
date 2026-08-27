> **Project:** Adlaw · **Doc:** Stack Decision · **Version:** 4.0 · **Date:** 2026-08-26
> **Status:** Final — supersedes v3.0 (Convex), which superseded v2.0 (Postgres/Supabase), which itself superseded v1.0 (Convex). See amendment in `00-intake.md`
> **Upstream:** `00-intake.md`, `docs/06-firebase-migration.md`

# Stack decision

**Recommendation:** Next.js (App Router) on Vercel · **Firebase** — Firestore
for data, Firebase Auth for identity (Google + email/password, open signup) ·
an ID-token cookie verified with `jose` in `proxy.ts` · Google OAuth for
Calendar read access, exchanged in a **Vercel Route Handler** (Firebase's
Spark plan has no Cloud Functions — see below) · Google Gemini (free tier)
behind a provider-agnostic adapter · hand-written CSS from `DESIGN.md` tokens.

## Why this changed a third time

v1.0 chose Convex, discounted for a beginner-friction argument the author later
told me to disregard. v2.0 reverted to Postgres/Supabase on merit. v2.0's own
justification broke when the author ran out of free Supabase projects, and v3.0
moved back to Convex. **v3.0 held through two further amendments** (multi-user
invite-gated signup in Amendment 3) before the author directed a fourth
data-layer decision: **Firebase**, adding Google sign-in and dropping the
invite gate for open signup. This is a stack decision, not a scope one — the
full v1 feature list (Calendar, config surfaces) is unaffected.

Three tradeoffs from `docs/06-firebase-migration.md`, stated here rather than
re-derived:

1. **The one-`now` invariant stops being server-enforced.** `firebase/tasks.ts`'s
   `move()` guarantees it inside a client-side Firestore `runTransaction` —
   correct for a well-behaved client, but not database-enforced the way a
   Convex mutation was. Blast radius is one user's own board.
2. **Ownership gets *stronger*, not weaker.** Firestore subcollection paths
   (`users/{uid}/tasks/{id}`) make ownership structural, checked by
   `firestore.rules`'s `request.auth.uid`, rather than a `userId` field a
   handler could forget to check.
3. **Dropping the invite gate reopens the free-tier quota exposure** Amendment
   3 built that gate for. Deliberate, the author's call, recorded honestly.

| Layer | Choice | Alternative considered | Why the alternative loses here |
|---|---|---|---|
| Framework | Next.js App Router | Vite + React SPA | Next gives one deploy target; Firebase's client SDK is called from client components directly, no second server needed for reads/writes |
| Hosting | Vercel | Netlify, Cloudflare Pages | Account already held. No technical differentiator at this scale |
| Data + server | **Firestore** | Staying on Convex | Convex's live-reactive queries and single-file schema were real advantages, but the author directed the move regardless — this is a stack decision, not a technical regression. Firestore's `onSnapshot` listeners are also reactive by default (see *Data fetching* row), so that specific advantage isn't lost, just re-obtained differently |
| Auth | **Firebase Auth** — Google + email/password, open signup | Staying on Convex Auth's invite-gated password provider | Firebase Auth's Google provider is the reason for this swap in the first place; email/password is kept alongside it for parity. Open signup is a separate, explicit decision (Amendment 4) — dropping the invite gate reopens quota exposure, accepted knowingly |
| Route gating | ID-token cookie, verified with `jose` in `proxy.ts` | An Admin-SDK session-cookie check in a Route Handler | `jose`'s `createRemoteJWKSet` + `jwtVerify` runs at the Edge with no service-account secret and no Admin SDK dependency — keeps `proxy.ts` as the sole redirect authority, same architectural role it had under Convex Auth's middleware |
| Calendar | Google OAuth (`calendar.readonly`), token exchange in a **Vercel Route Handler** | A Firebase Cloud Function doing the exchange | Firebase's Spark (no-billing) plan has no Cloud Functions. Firebase Auth's own Google provider returns only a short-lived access token, no refresh token — `googleRefreshTokenEncrypted` as designed in `03-backend-schema.md` is unreachable via Firebase Auth alone, so the OAuth code exchange has to happen somewhere else regardless. Vercel Route Handlers are free on the hobby tier and are the natural place for it (Slice 6, not built yet) |
| AI | Google Gemini, Flash-tier, free | Anthropic, OpenAI, a Python NLP service | Unaffected by this swap. See *Alternative considered and rejected: a Python parsing service* below |
| Schema validation | `firestore.rules` (field-level checks) + Zod | Convex validators alone | Convex's `v.object()` validated function arguments server-side; Firestore rules take over that role for writes. Zod is still needed for the *model's* JSON output, untrusted regardless of database |
| Data fetching | **Firestore `onSnapshot` listeners**, reactive by default | Server Actions + SWR revalidation | Matches what Convex's live queries already gave up nothing on — a write from any tab updates every mounted listener automatically, no manual `revalidatePath` |
| Styling | Hand-written CSS, `DESIGN.md` tokens | Tailwind, shadcn/ui | Unaffected. The visual system is already fully specified |

## Alternative considered and rejected: a Python parsing service

Unchanged by this swap — the reasoning was about the AI/parsing layer, not the
database, and applies identically on Firebase.

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

Firestore has no RLS-equivalent and no concept of a service-role key holding
the line between client and database — the client talks to Firestore directly,
same as it talked to Convex functions directly before. The actual boundary is:

- **Firebase Auth** issues a real ID token; `firestore.rules` checks
  `request.auth.uid` on every read and write, and `proxy.ts` verifies the same
  token (as a cookie) with `jose` before a route is even served.
- **Ownership is structural, not a field check.** Every user's data lives under
  `users/{uid}/…` — a rule of `request.auth.uid == uid` on that path segment is
  the entire authorization model. There is no `userId` field a handler could
  forget to filter by, because there's no handler: rules are declarative and
  evaluate on every request regardless of which client code path wrote it.
- **The one-`now` invariant is the one thing this boundary can't express** —
  it's a cross-document constraint, and Firestore rules only see one document
  at a time. It moves to a client-side `runTransaction` (tradeoff #1 above).

## What would change this decision

- **Firestore's free tier becomes insufficient**, or Convex's pricing/features
  become preferable again. A fifth reversal is possible but not free — see
  *Migration note* below.
- **Gemini's free tier stops covering the volume.** Swap the adapter. Unrelated
  to this decision, unaffected by it.
- **The open-signup quota exposure becomes a real problem** (abuse, cost). The
  invite gate (Amendment 3's mechanism) could be reinstated as a Firestore-side
  check without another data-layer swap.

## Migration note

This is the **third** data-layer reversal. If a fourth one happens, the module
boundary in `04-tdd.md` (`core/` stays pure, provider-agnostic `ai/`) is what
makes each swap a bounded, mechanical change rather than a rewrite — the parts
that are actually hard (capacity math, the cutline, free-window derivation)
have never moved and aren't touched by any of these swaps. This swap also added
two modules to that boundary permanently: `core/types.ts` (plain `Task`/`Course`
shapes, replacing generated `Doc<>`/`Id<>` types so `ui/` depends on `core/`
rather than a backend codegen artifact) and `core/order.ts` (the laneOrder
arithmetic, now pure and unit-testable without any backend or emulator).

## Services to create

| Service | Status | Needed for |
|---|---|---|
| Vercel | ✅ held | Deploy, and (Slice 6) the Calendar OAuth Route Handler |
| Firebase | ⬜ new, free (Spark plan) — `[[TBD: Firebase project]]` | Firestore, Firebase Auth, hosting for `firestore.rules`/indexes |
| Google AI Studio | ⬜ new, free — `[[TBD: API key]]` | Gemini adapter. Heuristic path works without it |
| Google Cloud project | ⬜ new, free — `[[TBD: OAuth client ID/secret]]` — deferred to Slice 6 | Calendar OAuth consent screen and credentials |
| Convex | ✅ held, **unused** | Superseded by Firebase as of Amendment 4 |
| Supabase | ✅ held, **unused** | Blocked on free-project limit; superseded by Convex, then Firebase |

// The abuse boundary in front of every app/api/ai/* Route Handler.
//
// Why this exists: signup is open to the public internet (docs/00-intake.md
// Amendment 4), and each of these routes spends a metered third-party
// resource — one shared Gemini free-tier key. proxy.ts already blocks
// anonymous callers, so the exposure is what a *registered* account can do,
// and "register once, then loop" is a two-line attack that exhausts the
// project's quota and degrades every real user to the heuristic fallback.
//
// Two independent limits, because they fail differently:
//   - per-uid, which is the honest unit of "who is doing this"
//   - global, which is the backstop for the case per-uid can't see: many
//     accounts, one attacker.
//
// Deliberately in-memory. This project's budget is zero (CLAUDE.md) and
// there is no Redis, so the counter lives in a module-level Map and is
// therefore PER SERVERLESS INSTANCE — the effective ceiling is this limit
// times the number of warm instances. That is approximate, and it is stated
// here rather than papered over: it turns unbounded abuse into bounded
// abuse, which is the actual goal. Firebase App Check is the durable fix and
// is free; see the plan's F1 note.

import { NextResponse } from "next/server";
import { UID_HEADER } from "@/sessionHeader";

// A window long enough that a burst can't just wait it out cheaply, short
// enough that a real user who hits it is unblocked in a minute.
export const WINDOW_MS = 60_000;
// Generous against real use: capture is one call per typed sentence, and
// breakdown/focus are explicit button presses (CLAUDE.md: "Every AI call is
// user-triggered" — nothing here fires on a timer or on page load).
export const MAX_PER_UID = 20;
export const MAX_GLOBAL = 300;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Bounds the Map itself, so a stream of distinct uids can't turn the
// rate limiter into its own memory-exhaustion vector.
const MAX_TRACKED = 10_000;

function hit(key: string, limit: number, now: number): boolean {
  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    if (buckets.size >= MAX_TRACKED) {
      for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
      // Still full after dropping expired entries: every bucket is live, so
      // this is an active flood. Fail closed rather than grow without bound.
      if (buckets.size >= MAX_TRACKED) return false;
    }
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

/**
 * Clears all counters. Exists so guard.test.ts can start each case from a
 * known state — the bucket Map is module-level and would otherwise leak
 * counts between tests, including the shared global bucket. Not used by
 * anything at runtime.
 */
export function resetRateLimit(): void {
  buckets.clear();
}

/**
 * Identifies the caller and charges one request against their quota.
 *
 * Returns a `NextResponse` when the request must not proceed, or the caller's
 * uid when it may. Callers treat a returned response as terminal:
 *
 *   const gate = guard(req);
 *   if (gate instanceof NextResponse) return gate;
 *
 * A 401 here should be unreachable in practice — proxy.ts redirects unauthed
 * requests before they arrive — but the check is not decorative: it is what
 * makes the handler correct on its own if the matcher is ever narrowed.
 */
export function guard(req: Request): NextResponse | string {
  const uid = req.headers.get(UID_HEADER);
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const now = Date.now();
  // Charge the global bucket only after per-uid passes, so one account
  // burning its own quota doesn't also spend the shared backstop.
  if (!hit(`uid:${uid}`, MAX_PER_UID, now) || !hit("global", MAX_GLOBAL, now)) {
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "retry-after": String(Math.ceil(WINDOW_MS / 1000)) } },
    );
  }
  return uid;
}

/**
 * The client-facing text for a failed AI call. The real error is logged
 * server-side and never returned: ai/gemini.ts builds its messages from the
 * raw upstream response body, which is internal detail the browser has no
 * use for — and which gets persisted to aiLog verbatim if passed through.
 */
export function safeError(kind: string, err: unknown): string {
  console.error(`[ai/${kind}] provider call failed`, err);
  return "provider call failed; used heuristic fallback";
}

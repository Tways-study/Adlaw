// Provider selection — never hardcoded at a call site (CLAUDE.md). Gemini
// when GEMINI_API_KEY is set, heuristic otherwise. This module reads
// process.env.GEMINI_API_KEY, which only ever resolves server-side: it is
// imported exclusively by the app/api/ai/* Route Handlers (never by ui/ or
// firebase/, which only ever talk to those routes over fetch), so the key
// itself never reaches a client bundle. See docs/00-stack-decision.md and
// docs/04-tdd.md's Environment table — GEMINI_API_KEY is Vercel server
// environment only, never NEXT_PUBLIC_.

import { GeminiProvider } from "./gemini";
import { heuristicProvider, HeuristicProvider } from "./heuristic";
import type { AiProvider } from "./types";

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

export interface ProviderInfo {
  provider: AiProvider;
  name: "gemini" | "heuristic";
  model: string;
}

export interface ProviderOverride {
  provider?: "gemini" | "heuristic";
  model?: string;
}

/**
 * Chooses the live provider for this request. Reads env fresh on every call
 * (rather than caching a module-level singleton) so a key added or removed
 * between requests — e.g. via Vercel env update — takes effect without a
 * redeploy of this module's own state.
 *
 * `override` is the per-user preference from settings/prefs
 * (`aiProvider`/`aiModel`), threaded through by the app/api/ai/* Route
 * Handlers on top of this env-var default:
 *   - `override.provider === "heuristic"` returns the heuristic provider
 *     unconditionally, ignoring any `override.model` — choosing "heuristic"
 *     means capture/breakdown/focus never call Gemini for that user,
 *     regardless of whether a key exists.
 *   - `override.provider === "gemini"` with no `GEMINI_API_KEY` set falls
 *     back to heuristic rather than throwing — there is one shared key, not
 *     per-user keys, so an unsatisfiable preference degrades quietly the
 *     same way every other AI failure path in this app does.
 *   - `override.model` only applies when the resolved provider is Gemini.
 *   - No override, or `override.provider` undefined, reproduces today's
 *     env-var-only behavior exactly.
 */
export function getProviderInfo(override?: ProviderOverride): ProviderInfo {
  if (override?.provider === "heuristic") {
    return { provider: heuristicProvider, name: "heuristic", model: "heuristic" };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    const model = override?.model || process.env.AI_MODEL || DEFAULT_GEMINI_MODEL;
    return { provider: new GeminiProvider(apiKey, model), name: "gemini", model };
  }
  return { provider: heuristicProvider, name: "heuristic", model: "heuristic" };
}

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

/**
 * Races `promise` against a timer. Used by every app/api/ai/* Route Handler
 * as the outer ceiling on top of GeminiProvider's own internal fetch
 * timeout — belt and suspenders, since the thing being raced here is
 * "the whole provider call", not just the network request inside it.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export { HeuristicProvider, heuristicProvider, GeminiProvider };
export * from "./types";

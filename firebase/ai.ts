// The client-side contract the UI calls for Slice 7 — it never touches
// fetch, timeouts, or provider selection directly (docs/04-tdd.md keeps
// GEMINI_API_KEY server-only, so every AI call must go through
// app/api/ai/*). Each function here always resolves with a usable result
// and its aiLog payload, and always writes that payload to
// users/{uid}/aiLog with the caller's own auth — the Route Handler can only
// return the payload, since there is no Admin SDK to write it as the user
// (see CLAUDE.md's Slice 7 scope note).

import { heuristicProvider } from "@/ai/heuristic";
import { move } from "./tasks";
import { writeAiLog } from "./aiLog";
import type { ParsedTask, BreakdownResult, FocusPick, FocusQueueTask, AiLogPayload } from "@/ai/types";
import type { Prefs, Task } from "@/core/types";
import type { Window } from "@/core/time";

// The subset of settings/prefs each request function threads through to its
// Route Handler as a per-request override on top of ai/index.ts's
// getProviderInfo() env-var default. Undefined (the caller passes nothing,
// or usePrefs() hasn't resolved yet) reproduces today's behavior exactly —
// the route handler treats absent fields as no override.
type AiPrefs = Pick<Prefs, "aiProvider" | "aiModel">;

// Same 4s ceiling app/api/ai/* enforces server-side — this is the second,
// independent layer: a server that never responds at all (not just one
// that responds slowly) must not block capture either.
const CLIENT_TIMEOUT_MS = 4000;

interface ParseOutcome {
  result: ParsedTask;
  log: AiLogPayload;
}
interface BreakdownOutcome {
  result: BreakdownResult;
  log: AiLogPayload;
}
interface FocusOutcome {
  result: FocusPick;
  log: AiLogPayload;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`${path} responded ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function localFallbackLog(
  kind: AiLogPayload["kind"],
  input: unknown,
  output: unknown,
  err: unknown,
): AiLogPayload {
  return {
    kind,
    input: JSON.stringify(input),
    output: JSON.stringify(output),
    provider: "heuristic",
    model: "heuristic",
    ok: false,
    error: err instanceof Error ? err.message : String(err),
    latencyMs: 0,
  };
}

function logQuietly(uid: string, log: AiLogPayload): void {
  // Fire-and-forget: aiLog is "the only honest measure of whether the core
  // promise works" (docs/03-backend-schema.md), but a failed write to it
  // must never block or fail the caller's actual request.
  void writeAiLog(uid, log).catch((err) => {
    console.error("aiLog write failed", err);
  });
}

/**
 * Parses one sentence into task fields. Always resolves — a network
 * failure, a non-2xx response, or the Route Handler's own Gemini-to-
 * heuristic fallback all still produce a usable ParsedTask, so capture can
 * create a card unconditionally regardless of connectivity (CLAUDE.md:
 * "Capture never fails"). The caller derives the Task's `parseState` from
 * `log.ok` — true -> "ok", false -> "fallback" — before calling
 * firebase/tasks.ts's create().
 */
export async function requestParse(
  uid: string,
  text: string,
  now: number,
  courseCodes?: string[],
  aiPrefs?: AiPrefs,
): Promise<ParseOutcome> {
  const body = { text, now, courseCodes, aiProvider: aiPrefs?.aiProvider, aiModel: aiPrefs?.aiModel };
  let outcome: ParseOutcome;
  try {
    outcome = await postJson<ParseOutcome>("/api/ai/parse", body);
  } catch (err) {
    const result = await heuristicProvider.parse(text, { now, courseCodes });
    outcome = { result, log: localFallbackLog("parse", body, result, err) };
  }
  logQuietly(uid, outcome.log);
  return outcome;
}

/**
 * Proposes an ordered breakdown for `task` (PRD M7). Never persists
 * anything — the caller shows the steps and, if accepted, calls
 * firebase/tasks.ts's createSteps to write them as schedulable child tasks.
 */
export async function requestBreakdown(uid: string, task: Task, aiPrefs?: AiPrefs): Promise<BreakdownOutcome> {
  const body = { task, aiProvider: aiPrefs?.aiProvider, aiModel: aiPrefs?.aiModel };
  let outcome: BreakdownOutcome;
  try {
    outcome = await postJson<BreakdownOutcome>("/api/ai/breakdown", body);
  } catch (err) {
    const result = await heuristicProvider.breakdown(task);
    outcome = { result, log: localFallbackLog("breakdown", body, result, err) };
  }
  logQuietly(uid, outcome.log);
  return outcome;
}

/**
 * Picks one task for "now" (PRD M8) and applies it immediately through
 * firebase/tasks.ts's move() — the transaction that enforces "at most one
 * task holds status='now'". Callers never see or set `status` directly for
 * a focus pick; this is the one function in this file with a side effect
 * beyond logging, exactly because that invariant must not be left to the
 * caller to remember. Resolves to `{ taskId: null, ... }` (and applies
 * nothing) when every candidate is excluded or the queue is empty.
 */
export async function requestFocus(
  uid: string,
  queue: FocusQueueTask[],
  windows: Window[],
  now: number,
  aiPrefs?: AiPrefs,
): Promise<FocusOutcome> {
  const body = { queue, windows, now, aiProvider: aiPrefs?.aiProvider, aiModel: aiPrefs?.aiModel };
  let outcome: FocusOutcome;
  try {
    outcome = await postJson<FocusOutcome>("/api/ai/focus", body);
  } catch (err) {
    const result = await heuristicProvider.focus(body);
    outcome = { result, log: localFallbackLog("focus", body, result, err) };
  }
  logQuietly(uid, outcome.log);
  if (outcome.result.taskId) {
    await move(uid, outcome.result.taskId, "now");
  }
  return outcome;
}

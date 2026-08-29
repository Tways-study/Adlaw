// The server boundary Firebase's Spark plan needs in place of Cloud
// Functions (docs/04-tdd.md §The AI layer) — this is the only place
// GEMINI_API_KEY is ever read (via ai/index.ts's getProviderInfo), so it
// never reaches the client bundle. Build prompt -> call provider -> parse
// JSON -> validate with Zod -> return. Every failure path (network, quota,
// timeout, malformed JSON, schema mismatch) converges here: log it, fall
// back to the heuristic, never throw to the UI. Capture must never fail —
// this handler always resolves with a usable ParsedTask.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getProviderInfo, withTimeout, heuristicProvider } from "@/ai";
import type { AiLogPayload } from "@/ai/types";
import { guard, safeError } from "../guard";

export const runtime = "nodejs";

// 4s hard ceiling per docs/02-app-flow.md's capture state machine
// ("submitting has a hard 4s ceiling"). Applied uniformly to breakdown and
// focus too for the same reason: no AI call may block the UI.
const TIMEOUT_MS = 4000;

// The capture box takes one sentence (docs/02-app-flow.md). This bound is an
// abuse limit rather than a product one — unbounded text goes straight into a
// Gemini prompt, so one request could otherwise cost thousands of requests'
// worth of tokens against the shared key, and the same string is stringified
// into aiLog where it would silently exceed Firestore's 1 MiB document cap.
// Rejecting with 400 is safe for the UI: firebase/ai.ts's postJson already
// turns any non-2xx into a heuristic fallback, so capture still never fails.
const MAX_CAPTURE_LEN = 2000;

const RequestSchema = z.object({
  text: z.string().min(1).max(MAX_CAPTURE_LEN),
  now: z.number(),
  courseCodes: z.array(z.string().max(64)).max(200).optional(),
});

export async function POST(req: Request) {
  const gate = guard(req);
  if (gate instanceof NextResponse) return gate;

  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  const { provider, name, model } = getProviderInfo();
  const ctx = { now: body.now, courseCodes: body.courseCodes };
  const input = JSON.stringify({ text: body.text, ctx });
  const started = Date.now();

  try {
    const result = await withTimeout(provider.parse(body.text, ctx), TIMEOUT_MS);
    const log: AiLogPayload = {
      kind: "parse",
      input,
      output: JSON.stringify(result),
      provider: name,
      model,
      ok: true,
      latencyMs: Date.now() - started,
    };
    return NextResponse.json({ result, log });
  } catch (err) {
    // The heuristic never throws — this is a genuine, always-successful
    // fallback, not a second chance to fail.
    const result = await heuristicProvider.parse(body.text, ctx);
    const log: AiLogPayload = {
      kind: "parse",
      input,
      output: JSON.stringify(result),
      provider: name,
      model,
      ok: false,
      error: safeError("parse", err),
      latencyMs: Date.now() - started,
    };
    return NextResponse.json({ result, log });
  }
}

// See app/api/ai/parse/route.ts for the shared shape of this handler family.
// PRD M8: one card chosen for Start here, with a one-line reason. This route
// only ever returns the pick — it does not touch Firestore. The invariant
// that `status = "now"` holds at most one task lives in firebase/tasks.ts's
// move() transaction; applying a pick is firebase/ai.ts's requestFocus,
// which calls move() rather than writing status directly (CLAUDE.md).

import { NextResponse } from "next/server";
import { z } from "zod";
import { getProviderInfo, withTimeout, heuristicProvider } from "@/ai";
import { MAX_ESTIMATE_MIN, type AiLogPayload } from "@/ai/types";
import { guard, safeError } from "../guard";

export const runtime = "nodejs";

const TIMEOUT_MS = 4000;

// Both arrays are bounded because every element is serialized into the focus
// prompt (ai/gemini.ts builds one line per queue entry and per window). An
// unbounded queue is therefore an unbounded prompt — the same token-cost
// amplification MAX_CAPTURE_LEN closes on the capture path. The ceilings sit
// far above any real board: a day has a handful of free windows, and a queue
// past a few hundred tasks is not a plan anyone is working from.
const MAX_QUEUE = 500;
const MAX_WINDOWS = 50;

const FocusQueueTaskSchema = z.object({
  _id: z.string().max(128),
  estimateMin: z.number().positive().max(MAX_ESTIMATE_MIN),
  dueAt: z.number().optional(),
  excludedFromFocusUntil: z.number().optional(),
});
const WindowSchema = z.object({ startMin: z.number(), endMin: z.number() });

const RequestSchema = z.object({
  queue: z.array(FocusQueueTaskSchema).max(MAX_QUEUE),
  windows: z.array(WindowSchema).max(MAX_WINDOWS),
  now: z.number(),
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
  const input = JSON.stringify(body);
  const started = Date.now();

  try {
    const result = await withTimeout(provider.focus(body), TIMEOUT_MS);
    const log: AiLogPayload = {
      kind: "focus",
      input,
      output: JSON.stringify(result),
      provider: name,
      model,
      ok: true,
      latencyMs: Date.now() - started,
    };
    return NextResponse.json({ result, log });
  } catch (err) {
    const result = await heuristicProvider.focus(body);
    const log: AiLogPayload = {
      kind: "focus",
      input,
      output: JSON.stringify(result),
      provider: name,
      model,
      ok: false,
      error: safeError("focus", err),
      latencyMs: Date.now() - started,
    };
    return NextResponse.json({ result, log });
  }
}

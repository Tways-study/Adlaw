// See app/api/ai/parse/route.ts for the shared shape of this handler family.
// PRD M7: large tasks split into ordered steps paced backward from the due
// date. Triggered by `shouldSplit`, or the S5 "break down" button — either
// way this route only ever returns the proposed steps; persisting them as
// schedulable child Task documents is a separate, explicit step the caller
// takes via firebase/tasks.ts's createSteps.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getProviderInfo, withTimeout, heuristicProvider } from "@/ai";
import { TaskSchema, type AiLogPayload } from "@/ai/types";
import { guard, safeError } from "../guard";

export const runtime = "nodejs";

const TIMEOUT_MS = 4000;

// TaskSchema bounds every user-controlled string and number it carries —
// see the note above its definition in ai/types.ts.
const RequestSchema = z.object({
  task: TaskSchema,
  // See app/api/ai/parse/route.ts's RequestSchema for what these carry.
  aiProvider: z.enum(["gemini", "heuristic"]).optional(),
  aiModel: z.string().max(64).optional(),
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

  const { provider, name, model } = getProviderInfo({ provider: body.aiProvider, model: body.aiModel });
  const input = JSON.stringify({ task: body.task });
  const started = Date.now();

  try {
    const result = await withTimeout(provider.breakdown(body.task), TIMEOUT_MS);
    const log: AiLogPayload = {
      kind: "breakdown",
      input,
      output: JSON.stringify(result),
      provider: name,
      model,
      ok: true,
      latencyMs: Date.now() - started,
    };
    return NextResponse.json({ result, log });
  } catch (err) {
    const result = await heuristicProvider.breakdown(body.task);
    const log: AiLogPayload = {
      kind: "breakdown",
      input,
      output: JSON.stringify(result),
      provider: name,
      model,
      ok: false,
      error: safeError("breakdown", err),
      latencyMs: Date.now() - started,
    };
    return NextResponse.json({ result, log });
  }
}

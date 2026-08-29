// The AI layer's contract (docs/04-tdd.md §The AI layer). Both GeminiParser
// and HeuristicParser implement AiProvider — the app is fully functional on
// HeuristicParser alone, with GeminiParser as a correct-but-dormant upgrade
// that only activates once GEMINI_API_KEY exists. May import core/ (plain
// data shapes) but never firebase/ or React — this is glue, not a UI or
// storage concern.
//
// Every shape a provider can hand back is Zod-validated before it's treated
// as trustworthy, per CLAUDE.md's "All AI responses are Zod-validated before
// touching the DB." Types are inferred from the schemas so the runtime check
// and the compile-time type can never drift apart.

import { z } from "zod";
// Relative, not "@/" — vitest.config.mts configures no path alias, and this
// module is loaded (transitively) by ai/heuristic.test.ts.
import type { Task } from "../core/types";
import type { Window } from "../core/time";

// ---- parse -----------------------------------------------------------

export interface ParseContext {
  now: number; // epoch ms — resolves relative dates ("thursday", "in 9 days")
  courseCodes?: string[]; // known course codes, offered as hint context only
}

// Ceilings on everything the model hands back. `estimateMin` is capped at a
// full day because a single task estimated at more than 24h isn't a plan,
// it's a coerced or hallucinated number — and an absurd value would flow
// straight into core/capacity's arithmetic and blow out the cutline. The
// schema is the right place to say so: this is the boundary where model
// output stops being trusted (CLAUDE.md: "All AI responses are Zod-validated
// before touching the DB"). A violation throws, which the Route Handlers
// already convert into a heuristic fallback.
export const MAX_ESTIMATE_MIN = 1440;
export const MAX_TITLE_LEN = 500;

export const ParsedTaskSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_LEN),
  courseCode: z.string().min(1).max(64).optional(),
  estimateMin: z.number().positive().max(MAX_ESTIMATE_MIN),
  dueAt: z.number().optional(),
  shouldSplit: z.boolean(),
});
export type ParsedTask = z.infer<typeof ParsedTaskSchema>;

// ---- breakdown ---------------------------------------------------------

export const BreakdownStepSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_LEN),
  estimateMin: z.number().positive().max(MAX_ESTIMATE_MIN),
  dueAt: z.number().optional(),
});
export const BreakdownResultSchema = z.object({
  // The prompt asks for 2–6; the ceiling is deliberately looser than that so
  // a slightly over-eager model still produces a usable result, while an
  // unbounded array can't turn one breakdown into hundreds of child writes.
  steps: z.array(BreakdownStepSchema).min(1).max(20),
});
export type BreakdownResult = z.infer<typeof BreakdownResultSchema>;

// ---- focus ---------------------------------------------------------

// A trimmed view of Task — only what focus-picking needs, so callers don't
// have to fabricate full Task documents (parentId, rawText, …) just to ask
// "which one next."
export interface FocusQueueTask {
  _id: string;
  estimateMin: number;
  dueAt?: number;
  excludedFromFocusUntil?: number;
}

export interface FocusInput {
  queue: FocusQueueTask[];
  windows: Window[];
  now: number;
}

export const FocusPickSchema = z.object({
  taskId: z.string().nullable(),
  reason: z.string().min(1),
});
export type FocusPick = z.infer<typeof FocusPickSchema>;

// ---- provider ---------------------------------------------------------

// Exactly docs/04-tdd.md §The AI layer's declared interface.
export interface AiProvider {
  parse(text: string, ctx: ParseContext): Promise<ParsedTask>;
  breakdown(task: Task): Promise<BreakdownResult>;
  focus(input: FocusInput): Promise<FocusPick>;
}

// ---- request-boundary schemas ------------------------------------------

// Mirrors core/types.ts's Task field-for-field. Lives here rather than in
// core/ because core/ has no imports outside itself (not even a validation
// library) — this is purely for validating the request body an
// app/api/ai/breakdown caller sends, one layer above that boundary.
// Every user-controlled string and number is bounded. These are request-abuse
// limits, not product limits: without them a single POST can carry megabytes
// of text that get interpolated straight into a Gemini prompt, so one request
// costs thousands of requests' worth of tokens against a shared free-tier key.
// See MAX_CAPTURE_LEN in app/api/ai/parse/route.ts for the same reasoning on
// the capture path.
export const TaskSchema = z.object({
  _id: z.string().max(128),
  title: z.string().max(MAX_TITLE_LEN),
  rawText: z.string().max(MAX_TITLE_LEN),
  courseId: z.string().max(128).optional(),
  estimateMin: z.number().positive().max(MAX_ESTIMATE_MIN),
  dueAt: z.number().optional(),
  status: z.enum(["shelf", "next", "now", "done"]),
  laneOrder: z.number(),
  parentId: z.string().max(128).optional(),
  stepIndex: z.number().optional(),
  parseState: z.enum(["ok", "fallback", "failed"]),
  excludedFromFocusUntil: z.number().optional(),
  createdAt: z.number(),
  completedAt: z.number().optional(),
});

// ---- aiLog ---------------------------------------------------------

// docs/03-backend-schema.md's aiLog table, minus `createdAt` — the client
// writer (firebase/aiLog.ts) stamps that at write time, the same way
// firebase/tasks.ts's create() stamps createdAt itself rather than trusting
// a caller-supplied clock reading.
export const AiLogPayloadSchema = z.object({
  kind: z.enum(["parse", "breakdown", "focus"]),
  input: z.string(),
  output: z.string().optional(),
  provider: z.string().min(1),
  model: z.string().min(1),
  ok: z.boolean(),
  error: z.string().optional(),
  latencyMs: z.number().min(0),
});
export type AiLogPayload = z.infer<typeof AiLogPayloadSchema>;

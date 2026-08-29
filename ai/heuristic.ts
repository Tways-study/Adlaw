// The fallback provider — a real answer, not a stub (docs/04-tdd.md: "Both
// are useful answers ... the app is fully functional with no API key at
// all"). Never throws and never touches the network: parse() wraps
// core/heuristic.ts's regex parser, breakdown()/focus() are thin adapters
// over core/breakdown.ts / core/focus.ts. This is the class GeminiParser's
// failures fall back to, and the only provider that exists before a
// GEMINI_API_KEY does.

// Relative, not "@/" — vitest.config.mts configures no path alias, and this
// module is loaded directly by ai/heuristic.test.ts (see ui/landing/copy.test.ts
// for the same convention).
import { parseHeuristic } from "../core/heuristic";
import { computeBreakdown } from "../core/breakdown";
import { pickFocus } from "../core/focus";
import type { Task } from "../core/types";
import type { AiProvider, ParseContext, ParsedTask, BreakdownResult, FocusInput, FocusPick } from "./types";

export class HeuristicProvider implements AiProvider {
  readonly name = "heuristic" as const;
  readonly model = "heuristic" as const;

  async parse(text: string, ctx: ParseContext): Promise<ParsedTask> {
    const r = parseHeuristic(text, ctx.now);
    return {
      title: r.title,
      courseCode: r.courseCode,
      estimateMin: r.estimateMin,
      dueAt: r.dueAt,
      shouldSplit: r.shouldSplit,
    };
  }

  async breakdown(task: Task): Promise<BreakdownResult> {
    return { steps: computeBreakdown(task.title, task.estimateMin, task.dueAt, Date.now()) };
  }

  async focus(input: FocusInput): Promise<FocusPick> {
    return pickFocus(input.queue, input.windows, input.now);
  }
}

// A shared instance is fine — this provider is stateless and side-effect
// free, so there is nothing per-request to isolate.
export const heuristicProvider = new HeuristicProvider();

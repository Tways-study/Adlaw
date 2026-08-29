// Pure. No I/O, no React, no Firebase imports — see CLAUDE.md's module-
// boundary rule. This is the fallback (and, until an AI key exists, the
// *only*) breakdown logic: HeuristicParser.breakdown's real implementation,
// a naive even split paced backward from the due date (PRD M7). Both
// GeminiParser and HeuristicParser expose the same BreakdownResult shape;
// this module is what makes the heuristic answer a real one rather than a
// stub — deterministic math never goes through the model.

export interface BreakdownStep {
  title: string;
  estimateMin: number;
  dueAt?: number;
}

const TARGET_STEP_MIN = 60;
const MIN_STEPS = 2;
const MAX_STEPS = 6;

/**
 * Splits one task into `stepCount` ordered steps whose `estimateMin` sum
 * back to exactly `estimateMin` (never a rounding leak), and whose optional
 * due dates are paced backward from `dueAt` when one exists.
 *
 * Step count targets ~60-minute chunks, clamped to [2, 6] so a 65-minute
 * task still gets a real split and a 10-hour task doesn't explode into
 * dozens of steps — and never more steps than there are whole minutes to
 * spread across, so a sub-2-minute task degrades to a single step instead
 * of producing a zero-minute one.
 */
export function computeBreakdown(
  title: string,
  estimateMin: number,
  dueAt: number | undefined,
  now: number,
): BreakdownStep[] {
  const safeEstimate = Math.max(1, Math.round(estimateMin));
  const desired = Math.round(safeEstimate / TARGET_STEP_MIN);
  const stepCount = Math.max(1, Math.min(MAX_STEPS, Math.max(MIN_STEPS, desired), safeEstimate));

  const base = Math.floor(safeEstimate / stepCount);
  const remainder = safeEstimate - base * stepCount;
  const dueAts = paceDueDates(stepCount, dueAt, now);

  const steps: BreakdownStep[] = [];
  for (let i = 0; i < stepCount; i++) {
    // Spread the remainder across the *last* steps rather than the first,
    // so the earliest (soonest-due) steps never look artificially padded.
    const minutes = base + (i >= stepCount - remainder ? 1 : 0);
    steps.push({
      title: `${title} — step ${i + 1} of ${stepCount}`,
      estimateMin: minutes,
      dueAt: dueAts[i],
    });
  }
  return steps;
}

/**
 * Evenly spaces `stepCount` due dates between `now` and `dueAt`, backward
 * from the deadline — the last step's due date is exactly `dueAt`. With no
 * due date at all, every step is undated (the parent's absence of a
 * deadline carries through). With a due date already at or before `now`,
 * there is no future span to pace across, so every step is due immediately
 * rather than producing a date before `now`.
 */
function paceDueDates(
  stepCount: number,
  dueAt: number | undefined,
  now: number,
): Array<number | undefined> {
  if (dueAt === undefined) return new Array<undefined>(stepCount).fill(undefined);
  const span = Math.max(0, dueAt - now);
  const interval = span / stepCount;
  return Array.from({ length: stepCount }, (_, i) => Math.round(now + interval * (i + 1)));
}

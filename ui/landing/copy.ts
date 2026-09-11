// Fixtures for the landing surface. Pure data — no React, no Convex, no I/O.
//
// Two rules govern this file:
//
// 1. Every number must survive being added up by a skeptical reader, and every
//    duration string must be exactly what `formatEstimate` produces for its
//    minute count. `copy.test.ts` asserts both against the real functions, so a
//    later parser or formatter change can't silently make the marketing page lie.
//
// 2. The demo sentences are parsed with FIXED_NOW rather than the wall clock, so
//    the "how capture works" section is deterministic and server-renderable. The
//    reader never sees an absolute date — only "due Thursday" — so a reference
//    date in the past is invisible to them and stable for us.

/** Mon 17 Aug 2026, 09:00 local. */
export const FIXED_NOW = new Date(2026, 7, 17, 9, 0, 0).getTime();

/** Pre-filled in the hero's live capture input. Parsed against the real clock. */
export const HERO_SENTENCE = "finish bio lab report by thursday";

/**
 * The three beats of "one sentence in, structure out". Each `claim` is what the
 * page renders; the test proves `parseHeuristic` still agrees with it.
 */
export interface DemoSentence {
  readonly raw: string;
  readonly claim: {
    readonly title: string;
    readonly courseCode?: string;
    readonly estimate: string;
    readonly due?: string;
    readonly shouldSplit: boolean;
    /**
     * The step count HowItWorks.tsx renders when `shouldSplit` is true —
     * derived there from `core/breakdown.ts`'s `computeBreakdown`, the same
     * function the board calls, not a literal. Required exactly when
     * `shouldSplit` is true; copy.test.ts checks both.
     */
    readonly stepCount?: number;
  };
}

export const DEMO_SENTENCES: readonly DemoSentence[] = [
  {
    raw: "finish bio lab report by thursday",
    claim: { title: "Finish bio lab report", estimate: "1h 30m", due: "due Thursday", shouldSplit: false },
  },
  {
    raw: "PHIL 101 essay draft by friday",
    claim: {
      title: "Essay draft",
      courseCode: "PHIL 101",
      estimate: "1h 30m",
      due: "due Friday",
      shouldSplit: false,
    },
  },
  {
    raw: "write ENGL 205 essay 4h by friday",
    claim: {
      title: "Write essay",
      courseCode: "ENGL 205",
      estimate: "4h",
      due: "due Friday",
      // Over three hours, so the app offers to break it into steps.
      shouldSplit: true,
      // computeBreakdown targets ~60-minute steps: 240min / 60 = 4.
      stepCount: 4,
    },
  },
];

// ── Capacity ────────────────────────────────────────────────────────────────
// Two slots side by side: a day that doesn't fit, and one that does. Minutes are
// the source of truth; the strings are asserted against formatEstimate.

export interface CapacityFixture {
  readonly freeMin: number;
  readonly plannedMin: number;
  readonly free: string;
  readonly planned: string;
  /** Signed remainder, always rendered as a positive duration. */
  readonly deltaMin: number;
  readonly delta: string;
  readonly over: boolean;
}

export const CAPACITY_OVER: CapacityFixture = {
  freeMin: 410, // 6h 50m
  plannedMin: 545, // 9h 05m
  free: "6h 50m",
  planned: "9h 05m",
  deltaMin: 135,
  delta: "2h 15m",
  over: true,
};

export const CAPACITY_FITS: CapacityFixture = {
  freeMin: 410,
  plannedMin: 320, // 5h 20m
  free: "6h 50m",
  planned: "5h 20m",
  deltaMin: 90,
  delta: "1h 30m",
  over: false,
};

// ── The focus card ──────────────────────────────────────────────────────────

export const FOCUS = {
  courseCode: "BIO 121",
  title: "Finish bio lab report",
  estimate: "1h 30m",
  due: "due Thursday",
  parentTitle: "Bio lab report",
  stepLabel: "step 2 of 4",
  stepsDone: 2,
  stepsTotal: 4,
  // The AI's one-line reason on the focus card.
  reason: "Due first, and it is the only thing that fits before work starts.",
} as const;

// ── The hero's board preview ────────────────────────────────────────────────
// A still of the real board in its over-capacity state. Minutes are the source
// of truth — BoardPreview.tsx formats them with formatEstimate. The focus task
// plus the queue sum to CAPACITY_OVER.plannedMin, and the cutline falls before
// the first task whose running total passes CAPACITY_OVER.freeMin; copy.test.ts
// asserts both, so the preview can't disagree with the capacity slot above it.

export interface PreviewTask {
  readonly courseCode?: string;
  readonly title: string;
  readonly estimateMin: number;
  readonly due?: string;
}

export const BOARD_PREVIEW: {
  readonly rail: readonly PreviewTask[];
  readonly focus: PreviewTask;
  readonly queue: readonly PreviewTask[];
  readonly cutLabel: string;
} = {
  rail: [
    { courseCode: "HIST 210", title: "Reading response", estimateMin: 45 },
    { courseCode: "CS 240", title: "Lab 3 write-up", estimateMin: 60 },
    { courseCode: "ENGL 205", title: "Write essay", estimateMin: 240 },
  ],
  focus: { courseCode: FOCUS.courseCode, title: FOCUS.title, estimateMin: 90, due: FOCUS.due },
  queue: [
    { courseCode: "PHIL 101", title: "Essay draft", estimateMin: 90, due: "due Friday" },
    { courseCode: "CS 240", title: "Problem set 4", estimateMin: 120, due: "due Tuesday" },
    { courseCode: "BIO 121", title: "Study for exam", estimateMin: 120, due: "due Wednesday" },
    { courseCode: "HIST 210", title: "Read chapter 4", estimateMin: 125 },
  ],
  cutLabel: "9:00 PM — today runs out here",
};

/**
 * Index into BOARD_PREVIEW.queue of the first task past the cutline — the same
 * rule the board uses: the first task whose running total, focus included,
 * exceeds the free minutes. -1 if everything fits.
 */
export function previewCutIndex(freeMin: number): number {
  let total = BOARD_PREVIEW.focus.estimateMin;
  for (let i = 0; i < BOARD_PREVIEW.queue.length; i++) {
    total += BOARD_PREVIEW.queue[i].estimateMin;
    if (total > freeMin) return i;
  }
  return -1;
}

// ── The 14-day horizon ──────────────────────────────────────────────────────

export interface HorizonRow {
  readonly day: string;
  readonly what: string;
  readonly in: string;
  readonly soon: boolean;
}

export const HORIZON: readonly HorizonRow[] = [
  { day: "Thu", what: "Bio lab report", in: "3d", soon: true },
  { day: "Fri", what: "PHIL 101 essay draft", in: "4d", soon: false },
  { day: "Tue", what: "CS 240 problem set", in: "8d", soon: false },
  { day: "Fri", what: "ENGL 205 essay", in: "11d", soon: false },
];

// ── Today's shape ───────────────────────────────────────────────────────────
// A 12-hour window, 08:00–20:00, at the prototype's 31px-per-hour pitch. Blocks
// are positioned in hours-from-start and converted to px by the component, so
// the geometry stays readable here instead of being a pile of magic offsets.

export const TIMELINE = {
  startHour: 8,
  endHour: 20,
  hourPx: 31,
  /** Where the usable day ends — the work shift starts at 16:00. */
  edgeHour: 16,
  edgeLabel: "4:00 — work starts",
  gutterHours: [8, 10, 12, 14, 16, 18, 20],
  committed: [
    { from: 9, to: 10.5, label: "BIO 121", detail: "lecture" },
    { from: 11, to: 12.5, label: "HIST 210", detail: "seminar" },
    { from: 16, to: 20, label: "Work shift", detail: "" },
  ],
  planned: [
    { from: 13, to: 14.5, label: "Finish bio lab report", detail: "1h 30m", spill: false },
    { from: 14.5, to: 16, label: "Essay draft", detail: "1h 30m", spill: false },
    { from: 16, to: 18, label: "Study for exam", detail: "2h", spill: true },
  ],
} as const;

// ── The fields this product refuses to ask for ──────────────────────────────
// Rendered struck through beside the single capture input.

export const REFUSED_FIELDS: readonly string[] = [
  "Project",
  "Tags",
  "Priority",
  "Due",
  "Estimate",
  "Energy",
  "Context",
];

/**
 * Slices 4–7 are unbuilt: there is no capacity slot, cutline, timeline, step
 * breakdown, or AI reason line in `ui/` yet. Any miniature depicting one carries
 * this line. The product's stated personality is "calm, physical, honest" — a
 * page that shows unshipped work as shipped contradicts it.
 */
export const NOT_SHIPPED = "Planned. Not shipped yet.";

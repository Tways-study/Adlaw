// Pure. No I/O, no React, no Convex imports — see CLAUDE.md's module-boundary
// rule. This is the fallback parser: Slice 2 has no AI at all, so this is the
// *only* parser today, and it later becomes Slice 7's HeuristicParser.parse.

export interface HeuristicParseResult {
  title: string;
  courseCode?: string;
  estimateMin: number;
  dueAt?: number;
  shouldSplit: boolean;
}

const COURSE_CODE_RE = /\b([A-Za-z]{2,5})\s?-?\.?\s?(\d{1,4})\b/;
// Common short words that would otherwise false-positive as a course prefix
// once a single trailing digit is allowed (e.g. "in 9 days", "reading wk 7").
const COURSE_PREFIX_STOPWORDS = new Set(["in", "on", "at", "by", "wk", "no", "is", "to", "of", "or"]);

const DURATION_HM_RE = /\b(\d+)\s*h(?:r|rs|our|ours)?\s*(\d+)\s*m(?:in|ins)?\b/i;
const DURATION_HOURS_RE = /\b(\d+(?:\.\d+)?)\s*h(?:r|rs|our|ours)?\b/i;
const DURATION_MIN_RE = /\b(\d+)\s*m(?:in|ins)?\b/i;

const ESTIMATE_KEYWORDS: Array<[RegExp, number]> = [
  [/\bread(?:ing)?\b/i, 45],
  [/\b(essay|report|lab)\b/i, 90],
  [/\b(pset|problem set)\b/i, 90],
  [/\b(email|quick)\b/i, 10],
  [/\b(exam|study)\b/i, 120],
];
const DEFAULT_ESTIMATE_MIN = 30;

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WEEKDAY_DUE_RE = new RegExp(
  `\\b(?:by|on|due)?\\s*(${WEEKDAYS.join("|")})\\b`,
  "i",
);
const IN_N_DAYS_RE = /\bin\s+(\d+)\s+days?\b/i;

const FILLER_WORDS = new Set(["for", "the", "a", "an"]);

function endOfLocalDay(date: Date): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function nextWeekday(from: Date, targetWeekday: number): Date {
  const currentWeekday = from.getDay();
  let delta = targetWeekday - currentWeekday;
  if (delta <= 0) delta += 7;
  return addDays(from, delta);
}

function extractCourseCode(text: string): { courseCode?: string; remainder: string } {
  const re = new RegExp(COURSE_CODE_RE, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const [full, letters, digits] = match;
    if (COURSE_PREFIX_STOPWORDS.has(letters.toLowerCase())) continue;
    const courseCode = `${letters.toUpperCase()} ${digits}`;
    const remainder = text.slice(0, match.index) + text.slice(match.index + full.length);
    return { courseCode, remainder };
  }
  return { remainder: text };
}

function extractEstimate(text: string): { estimateMin: number; remainder: string } {
  let match = DURATION_HM_RE.exec(text);
  if (match) {
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    return {
      estimateMin: hours * 60 + minutes,
      remainder: text.slice(0, match.index) + text.slice(match.index + match[0].length),
    };
  }

  match = DURATION_HOURS_RE.exec(text);
  if (match) {
    const hours = Number(match[1]);
    return {
      estimateMin: Math.round(hours * 60),
      remainder: text.slice(0, match.index) + text.slice(match.index + match[0].length),
    };
  }

  match = DURATION_MIN_RE.exec(text);
  if (match) {
    return {
      estimateMin: Number(match[1]),
      remainder: text.slice(0, match.index) + text.slice(match.index + match[0].length),
    };
  }

  for (const [re, minutes] of ESTIMATE_KEYWORDS) {
    if (re.test(text)) {
      return { estimateMin: minutes, remainder: text };
    }
  }

  return { estimateMin: DEFAULT_ESTIMATE_MIN, remainder: text };
}

function extractDueDate(text: string, now: Date): { dueAt?: number; remainder: string } {
  let match = WEEKDAY_DUE_RE.exec(text);
  if (match) {
    const weekday = WEEKDAYS.indexOf(match[1].toLowerCase());
    const due = nextWeekday(now, weekday);
    return {
      dueAt: endOfLocalDay(due),
      remainder: text.slice(0, match.index) + text.slice(match.index + match[0].length),
    };
  }

  if (/\btomorrow\b/i.test(text)) {
    match = /\btomorrow\b/i.exec(text)!;
    return {
      dueAt: endOfLocalDay(addDays(now, 1)),
      remainder: text.slice(0, match.index) + text.slice(match.index + match[0].length),
    };
  }

  if (/\btoday\b/i.test(text)) {
    match = /\btoday\b/i.exec(text)!;
    return {
      dueAt: endOfLocalDay(now),
      remainder: text.slice(0, match.index) + text.slice(match.index + match[0].length),
    };
  }

  match = IN_N_DAYS_RE.exec(text);
  if (match) {
    const days = Number(match[1]);
    return {
      dueAt: endOfLocalDay(addDays(now, days)),
      remainder: text.slice(0, match.index) + text.slice(match.index + match[0].length),
    };
  }

  return { remainder: text };
}

function cleanTitle(remainder: string, rawText: string): string {
  const words = remainder
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 0);

  while (words.length > 0 && FILLER_WORDS.has(words[0].toLowerCase())) {
    words.shift();
  }

  const cleaned = words.join(" ").trim();
  if (cleaned.length === 0) return rawText.trim();

  return cleaned[0].toUpperCase() + cleaned.slice(1);
}

export function parseHeuristic(rawText: string, now: number): HeuristicParseResult {
  const nowDate = new Date(now);

  const { courseCode, remainder: afterCourse } = extractCourseCode(rawText);
  const { estimateMin, remainder: afterEstimate } = extractEstimate(afterCourse);
  const { dueAt, remainder: afterDue } = extractDueDate(afterEstimate, nowDate);
  const title = cleanTitle(afterDue, rawText);

  return {
    title,
    courseCode,
    estimateMin,
    dueAt,
    shouldSplit: estimateMin > 180,
  };
}

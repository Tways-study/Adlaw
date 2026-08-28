// ui-layer only — core/time.ts stays in minutes past local midnight and
// never touches a clock string, per CLAUDE.md's unit-conversion rule.

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function weekdayName(weekday: number): string {
  return WEEKDAY_NAMES[weekday] ?? "";
}

/** minutes past midnight -> "HH:MM" for <input type="time">. */
export function minutesToTimeInput(min: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(min)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "HH:MM" from <input type="time"> -> minutes past midnight, or null if unparseable. */
export function timeInputToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** "9:00 AM" style clock label for read-only display. */
export function formatClock(min: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(min)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  const h12 = ((h + 11) % 12) + 1;
  const period = h < 12 ? "AM" : "PM";
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function formatEstimate(min: number): string {
  const hours = Math.floor(min / 60);
  const minutes = min % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function formatDue(dueAt: number, now: number): string {
  const due = new Date(dueAt);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);

  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return "due today";
  if (diffDays === 1) return "due tomorrow";
  if (diffDays > 1 && diffDays <= 6) return `due ${WEEKDAY_NAMES[due.getDay()]}`;
  if (diffDays > 6) return `in ${diffDays}d`;
  return `due ${WEEKDAY_NAMES[due.getDay()]}`;
}

export function startOfLocalDay(now: number = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// core/time.ts stays in minutes past local midnight; this is the ui-layer
// conversion to a clock label, used by the cutline's text equivalent.
export function formatClock(min: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(min)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  const h12 = ((h + 11) % 12) + 1;
  const period = h < 12 ? "AM" : "PM";
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

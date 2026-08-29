export type TaskStatus = "shelf" | "next" | "now" | "done";
export type MovableStatus = "shelf" | "next" | "now";
export type ParseState = "ok" | "fallback" | "failed";

export interface Task {
  _id: string;
  title: string;
  rawText: string;
  courseId?: string;
  estimateMin: number;
  dueAt?: number;
  status: TaskStatus;
  laneOrder: number;
  parentId?: string;
  stepIndex?: number;
  parseState: ParseState;
  excludedFromFocusUntil?: number;
  createdAt: number;
  completedAt?: number;
}

export interface Course {
  _id: string;
  code: string;
  name?: string;
  active: boolean;
}

export type BlockKind = "class" | "work" | "commute" | "other";

export interface ScheduleBlock {
  _id: string;
  weekday: number;     // 0 = Sunday … 6 = Saturday
  startMin: number;    // minutes past local midnight, 0–1439
  endMin: number;      // minutes past local midnight, startMin < endMin ≤ 1440
  label: string;       // "BIO 210 lecture"
  kind: BlockKind;
  activeFrom: number;  // epoch ms — when this recurring rule took effect
  activeTo?: number;   // epoch ms — when it stopped; absent = still active
}

// Mirrors docs/03-backend-schema.md's settings/prefs table field-for-field,
// including fields not written until later slices (Task already carries
// parentId/stepIndex/excludedFromFocusUntil the same way).
export interface Prefs {
  _id: string;          // always "prefs" — settings is a single fixed-id doc per user
  dayEndMin?: number;   // editable evening cutoff; caller defaults to 1260 (21:00) when absent
  theme?: "light" | "dark" | "auto";              // written by ui/settings/ThemeSection.tsx
  aiProvider?: string;                             // written by ui/settings/AiProviderSection.tsx
  aiModel?: string;                                // written by ui/settings/AiProviderSection.tsx
  googleRefreshTokenEncrypted?: string;            // written by app/api/calendar/callback, encrypted at rest
  googleConnectedAt?: number;                      // written by app/api/calendar/callback
  googleLastSyncedAt?: number;                     // written by app/api/calendar/sync on a successful sync
  googleSyncStatus?: "ok" | "expired" | "error";   // written by callback (ok) and sync (ok/expired/error)
}

// Mirrors docs/03-backend-schema.md's calendarCache/{eventId} table
// field-for-field. Written only by app/api/calendar/sync's wholesale
// replace; read by firebase/hooks.tsx's useCalendarCache and, via
// ui/board/useDayPlan.ts's mapping down to core/time.ts's CalendarEvent
// shape, by freeWindows/busyIntervals.
export interface CalendarCacheEntry {
  _id: string;
  gcalId: string;
  startsAt: number; // epoch ms
  endsAt: number;   // epoch ms
  title: string;
  fetchedAt: number; // epoch ms — when this sync ran
}

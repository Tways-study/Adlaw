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
  theme?: "light" | "dark" | "auto";              // Slice 8, not written yet
  aiProvider?: string;                             // Slice 7/8, not written yet
  aiModel?: string;                                // Slice 7/8, not written yet
  googleRefreshTokenEncrypted?: string;            // Slice 6 — unreachable via Firebase Auth alone
  googleConnectedAt?: number;                      // Slice 6, not written yet
  googleLastSyncedAt?: number;                     // Slice 6, not written yet
  googleSyncStatus?: "ok" | "expired" | "error";   // Slice 6, not written yet
}

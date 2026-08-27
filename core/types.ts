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

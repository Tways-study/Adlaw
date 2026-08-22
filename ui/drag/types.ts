import type { Id } from "@/convex/_generated/dataModel";

export type MovableStatus = "shelf" | "next" | "now";

export interface DropTarget {
  status: MovableStatus;
  beforeId?: Id<"tasks">;
  afterId?: Id<"tasks">;
}

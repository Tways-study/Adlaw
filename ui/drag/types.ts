export type MovableStatus = "shelf" | "next" | "now";

export interface DropTarget {
  status: MovableStatus;
  beforeId?: string;
  afterId?: string;
}

import type { Id } from "@/convex/_generated/dataModel";
import type { DropTarget, MovableStatus } from "./types";

interface Point {
  x: number;
  y: number;
}

const LANE_ORDER: MovableStatus[] = ["shelf", "next", "now"];

// Re-measures live DOM rects on every call rather than caching — cheap at
// the task volumes this app deals with (docs/03-backend-schema.md's
// laneOrder note: "at ~40 tasks this will not be reached"), and avoids
// keeping a second, easily-stale source of truth for card positions.
export function resolveDropTarget(
  point: Point,
  lanes: Partial<Record<MovableStatus, HTMLElement | null>>,
  excludeTaskId: Id<"tasks">,
): DropTarget | null {
  for (const status of LANE_ORDER) {
    const el = lanes[status];
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (point.x < rect.left || point.x > rect.right || point.y < rect.top || point.y > rect.bottom) continue;

    // "now" (Start Here) holds at most one task — no per-card position to
    // resolve within it. "shelf" (Everything) is grouped by course rather
    // than rendered as one flat ordered list, so a cross-group DOM midpoint
    // isn't a meaningful insertion point — appending is the only position
    // that means anything there.
    if (status === "now" || status === "shelf") return { status };

    const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-task-id]")).filter(
      (card) => card.dataset.taskId !== excludeTaskId,
    );

    let beforeId: Id<"tasks"> | undefined;
    let afterId: Id<"tasks"> | undefined;
    for (const card of cards) {
      const cardRect = card.getBoundingClientRect();
      const midY = cardRect.top + cardRect.height / 2;
      const id = card.dataset.taskId as Id<"tasks">;
      if (point.y < midY) {
        afterId = id;
        break;
      }
      beforeId = id;
    }

    return { status, beforeId, afterId };
  }
  return null;
}

// A card's current position expressed the same way a drop resolves to one —
// used to detect a "moved back to where it started" drag so the caller can
// skip a no-op mutation. Reads DOM siblings rather than lane contents so it
// works identically for the "now" lane (no siblings) and the ordered ones.
export function currentNeighbors(cardEl: HTMLElement, status: MovableStatus): DropTarget {
  // Matches resolveDropTarget's treatment of these two lanes — neither
  // exposes a meaningful "current position" beyond its lane membership.
  if (status === "now" || status === "shelf") return { status };

  const prev = cardEl.previousElementSibling as HTMLElement | null;
  const next = cardEl.nextElementSibling as HTMLElement | null;
  return {
    status,
    beforeId: (prev?.dataset.taskId as Id<"tasks"> | undefined) ?? undefined,
    afterId: (next?.dataset.taskId as Id<"tasks"> | undefined) ?? undefined,
  };
}

export function sameDropTarget(a: DropTarget, b: DropTarget): boolean {
  return a.status === b.status && a.beforeId === b.beforeId && a.afterId === b.afterId;
}

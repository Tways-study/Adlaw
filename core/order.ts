const LANE_GAP = 1024;

/**
 * Pure laneOrder arithmetic, lifted out of convex/tasks.ts's nextLaneOrder /
 * resolveDropLaneOrder. `before`/`after` are the *validated* neighbor
 * laneOrders (already checked for right user/right status by the caller —
 * see firebase/tasks.ts) or null if absent/invalid. `lastInLane` is the
 * current highest laneOrder in the destination lane, or null if empty —
 * only consulted when there's no valid `after`.
 *
 * Preserves the exact, slightly asymmetric rule from the source: a valid
 * `before` alone (no valid `after`) is NOT "insert after before" — it
 * degrades straight to append, same as no neighbors at all. Only
 * before+after together produce a midpoint; after-alone produces a prepend.
 */
export function computeLaneOrder(
  before: number | null,
  after: number | null,
  lastInLane: number | null,
): number {
  if (before !== null && after !== null) return (before + after) / 2;
  if (after !== null) return after - LANE_GAP;
  return lastInLane === null ? 0 : lastInLane + LANE_GAP;
}

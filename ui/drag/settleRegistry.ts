// A cross-lane drag moves the dragged TaskCard to a different lane's
// subtree, so React unmounts the origin instance and mounts a fresh one at
// the destination — there is no single component instance alive across the
// whole gesture to hold "where it was released" state in. This registry is
// the hand-off: the origin instance's finishDrag() writes the release rect
// and velocity here, keyed by task id; whichever instance re-renders next
// with that task id (the same instance, for a same-lane reorder, or a new
// one, for a cross-lane move) reads it, inverts against its own newly
// measured rect, and consumes the entry so it only plays once.
//
// Module-level rather than React state or context on purpose: it needs to
// outlive the specific component instance that wrote it, and nothing here
// is meant to trigger a render — the consuming side reads it once inside a
// layout effect, not via a subscription.

export interface SettleEntry {
  /** Viewport position (getBoundingClientRect's left/top) at release. */
  left: number;
  top: number;
  /** Release velocity in px/s, for the spring's initial velocity. */
  velocityX: number;
  velocityY: number;
}

const registry = new Map<string, SettleEntry>();

export function registerSettle(taskId: string, entry: SettleEntry): void {
  registry.set(taskId, entry);
}

/** Reads and removes the entry so a settle only ever plays once. */
export function consumeSettle(taskId: string): SettleEntry | null {
  const entry = registry.get(taskId);
  if (entry) registry.delete(taskId);
  return entry ?? null;
}

/** Non-destructive check, for sizing initial render state before the layout effect runs. */
export function hasPendingSettle(taskId: string): boolean {
  return registry.has(taskId);
}

"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { move } from "@/firebase/tasks";
import { useAuth } from "@/firebase/hooks";
import type { Task } from "@/core/types";
import { useDragContext } from "./DragContext";
import { resolveDropTarget, currentNeighbors, sameDropTarget } from "./dropDetection";
import type { DropTarget, MovableStatus } from "./types";
import { prefersReducedMotion } from "./reducedMotion";

// Below this many pixels of pointer travel, a pointerdown+pointerup is a
// click (toggle S5's expanded detail), not a drag — lets TaskCard keep both
// gestures on the same button.
const DRAG_THRESHOLD_PX = 5;
const SETTLE_MS = 200;

interface PointerDragState {
  pointerId: number;
  grabX: number;
  grabY: number;
  startLeft: number;
  startTop: number;
  startWidth: number;
  origin: DropTarget;
  dragged: boolean;
}

// Pass 1's settle is a plain transform transition back to the pointer-down
// origin, not a full FLIP-to-new-position (that's real work across lane
// boundaries, since a cross-lane move unmounts this component from one
// lane's tree and mounts a fresh instance in another's — deferred to
// Pass 2 alongside the spring physics). The card still visibly glides
// instead of teleporting; it just glides to where it was picked up, and
// then appears in its real new slot once settling ends.
interface SettleState {
  anchorLeft: number;
  anchorTop: number;
  releaseLeft: number;
  releaseTop: number;
  width: number;
  phase: "start" | "animate";
}

export interface DraggableCard {
  rootProps: {
    ref: (el: HTMLElement | null) => void;
    onPointerDown: (e: ReactPointerEvent) => void;
    onPointerMove: (e: ReactPointerEvent) => void;
    onPointerUp: (e: ReactPointerEvent) => void;
    onPointerCancel: (e: ReactPointerEvent) => void;
    style: CSSProperties;
  };
  isDragging: boolean;
  placeholderHeight: number | null;
  /** Consumes the "a drag just happened" flag — call from onClick to skip the expand toggle after a real drag. */
  didDrag: () => boolean;
}

export function useDraggableCard(task: Task): DraggableCard {
  const { user } = useAuth();
  const { getLaneElement, setDraggingId } = useDragContext();

  const elRef = useRef<HTMLElement | null>(null);
  const setElRef = useCallback((el: HTMLElement | null) => {
    elRef.current = el;
  }, []);

  const dragRef = useRef<PointerDragState | null>(null);
  const didDragRef = useRef(false);

  const [isDragging, setIsDragging] = useState(false);
  const [flight, setFlight] = useState<{ left: number; top: number; width: number } | null>(null);
  const [placeholderHeight, setPlaceholderHeight] = useState<number | null>(null);
  const [settle, setSettle] = useState<SettleState | null>(null);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      // Let clicks inside the expanded detail's Complete/Delete/Undo
      // buttons behave as plain clicks, never the start of a drag.
      if ((e.target as HTMLElement).closest("[data-drag-ignore]")) return;
      const el = elRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      dragRef.current = {
        pointerId: e.pointerId,
        grabX: e.clientX - rect.left,
        grabY: e.clientY - rect.top,
        startLeft: rect.left,
        startTop: rect.top,
        startWidth: rect.width,
        origin: currentNeighbors(el, task.status as MovableStatus),
        dragged: false,
      };
    },
    [task.status],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const s = dragRef.current;
      if (!s) return;
      const left = e.clientX - s.grabX;
      const top = e.clientY - s.grabY;

      if (!s.dragged) {
        if (Math.abs(left - s.startLeft) < DRAG_THRESHOLD_PX && Math.abs(top - s.startTop) < DRAG_THRESHOLD_PX) {
          return;
        }
        s.dragged = true;
        elRef.current?.setPointerCapture(s.pointerId);
        setPlaceholderHeight(elRef.current?.getBoundingClientRect().height ?? null);
        setIsDragging(true);
        setDraggingId(task._id);
      }

      setFlight({ left, top, width: s.startWidth });
    },
    [setDraggingId, task._id],
  );

  const finishDrag = useCallback(
    (e: ReactPointerEvent) => {
      const s = dragRef.current;
      dragRef.current = null;
      if (!s) return;

      const el = elRef.current;
      if (el?.hasPointerCapture(s.pointerId)) el.releasePointerCapture(s.pointerId);
      if (!s.dragged) return;

      didDragRef.current = true;

      const target = resolveDropTarget(
        { x: e.clientX, y: e.clientY },
        { shelf: getLaneElement("shelf"), next: getLaneElement("next"), now: getLaneElement("now") },
        task._id,
      );
      if (target && !sameDropTarget(target, s.origin) && user) {
        void move(user.uid, task._id, target.status, target.beforeId, target.afterId);
      }

      setDraggingId(null);
      setPlaceholderHeight(null);

      const releaseLeft = e.clientX - s.grabX;
      const releaseTop = e.clientY - s.grabY;

      if (prefersReducedMotion()) {
        setIsDragging(false);
        setFlight(null);
        return;
      }

      setSettle({
        anchorLeft: s.startLeft,
        anchorTop: s.startTop,
        releaseLeft,
        releaseTop,
        width: s.startWidth,
        phase: "start",
      });
    },
    [getLaneElement, user, setDraggingId, task._id],
  );

  // Two-phase FLIP-style settle: paint at the release point using a
  // transform offset from the anchor (no transition, "start"), then on the
  // next frame zero the transform with a transition enabled ("animate") so
  // the browser actually animates the change instead of coalescing it.
  useLayoutEffect(() => {
    if (!settle || settle.phase !== "start") return;
    const raf = requestAnimationFrame(() => {
      setSettle((current) => (current ? { ...current, phase: "animate" } : current));
    });
    return () => cancelAnimationFrame(raf);
  }, [settle]);

  useLayoutEffect(() => {
    if (!settle || settle.phase !== "animate") return;
    const timeout = window.setTimeout(() => {
      setSettle(null);
      setIsDragging(false);
      setFlight(null);
    }, SETTLE_MS);
    return () => window.clearTimeout(timeout);
  }, [settle]);

  const didDrag = useCallback(() => {
    const v = didDragRef.current;
    didDragRef.current = false;
    return v;
  }, []);

  const style: CSSProperties = { touchAction: "none" };
  if (settle) {
    style.position = "fixed";
    style.left = settle.anchorLeft;
    style.top = settle.anchorTop;
    style.width = settle.width;
    style.zIndex = "var(--z-drag)";
    style.boxShadow = "var(--lift-3)";
    style.transition = settle.phase === "animate" ? `transform ${SETTLE_MS}ms var(--ease)` : "none";
    style.transform =
      settle.phase === "start"
        ? `translate3d(${settle.releaseLeft - settle.anchorLeft}px, ${settle.releaseTop - settle.anchorTop}px, 0)`
        : "translate3d(0, 0, 0)";
  } else if (isDragging && flight) {
    style.position = "fixed";
    style.left = flight.left;
    style.top = flight.top;
    style.width = flight.width;
    style.zIndex = "var(--z-drag)";
    style.boxShadow = "var(--lift-3)";
    style.transition = "none";
  }

  return {
    rootProps: {
      ref: setElRef,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag,
      style,
    },
    isDragging: isDragging || settle !== null,
    placeholderHeight,
    didDrag,
  };
}

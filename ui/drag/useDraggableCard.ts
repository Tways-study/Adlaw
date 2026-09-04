"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { animate, type AnimationPlaybackControlsWithThen } from "framer-motion";
import { move } from "@/firebase/tasks";
import { useAuth } from "@/firebase/hooks";
import type { Task } from "@/core/types";
import { useDragContext } from "./DragContext";
import { resolveDropTarget, currentNeighbors, sameDropTarget } from "./dropDetection";
import type { DropTarget, MovableStatus } from "./types";
import { prefersReducedMotion } from "./reducedMotion";
import { CARD_SETTLE_SPRING } from "./springs";
import { registerSettle, consumeSettle, hasPendingSettle } from "./settleRegistry";

// Below this many pixels of pointer travel, a pointerdown+pointerup is a
// click (toggle S5's expanded detail), not a drag — lets TaskCard keep both
// gestures on the same button.
const DRAG_THRESHOLD_PX = 5;

// How far back to look for a release velocity. Long enough to smooth out a
// single noisy pointermove sample, short enough that a pause-then-flick
// reads as the flick's velocity, not an average that includes the pause.
const VELOCITY_SAMPLE_MS = 60;

interface PointerSample {
  x: number;
  y: number;
  t: number;
}

interface PointerDragState {
  pointerId: number;
  grabX: number;
  grabY: number;
  startLeft: number;
  startTop: number;
  startWidth: number;
  origin: DropTarget;
  dragged: boolean;
  samples: PointerSample[];
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
  const settleControlsRef = useRef<AnimationPlaybackControlsWithThen | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [flight, setFlight] = useState<{ left: number; top: number; width: number } | null>(null);
  const [placeholderHeight, setPlaceholderHeight] = useState<number | null>(null);
  // Lazily peeks the registry so the very first render already reflects a
  // pending settle (avoids one frame at rest before the layout effect below
  // applies the invert). The peek is non-destructive; consumeSettle in the
  // effect is what actually claims the entry.
  const [isSettling, setIsSettling] = useState(() => hasPendingSettle(task._id));

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      // Let clicks inside the expanded detail's Complete/Delete/Undo
      // buttons behave as plain clicks, never the start of a drag.
      if ((e.target as HTMLElement).closest("[data-drag-ignore]")) return;
      const el = elRef.current;
      if (!el) return;
      // Grabbing a still-settling card mid-flight must redirect it, not wait
      // for it to finish — apple-design's interruptibility principle. Stop
      // the in-flight spring first: getBoundingClientRect() below then reads
      // wherever the animation actually was on screen (the "presentation"
      // value), which is exactly the rect a fresh drag needs to start from.
      settleControlsRef.current?.stop();
      settleControlsRef.current = null;
      setIsSettling(false);

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
        samples: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }],
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

      // Keep only samples within the velocity window — release velocity
      // should reflect the most recent motion, not the whole drag.
      s.samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
      while (s.samples.length > 1 && e.timeStamp - s.samples[0].t > VELOCITY_SAMPLE_MS) {
        s.samples.shift();
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
      setIsDragging(false);
      setFlight(null);

      if (prefersReducedMotion()) return;

      // Release velocity from the samples still inside the window
      // (handlePointerMove already trimmed to VELOCITY_SAMPLE_MS) — the
      // oldest surviving sample vs. this release event, so a brief pause
      // right before release correctly reads as near-zero velocity rather
      // than averaging in motion from earlier in the drag.
      const oldest = s.samples[0];
      const dt = (e.timeStamp - oldest.t) / 1000;
      const velocityX = dt > 0 ? (e.clientX - oldest.x) / dt : 0;
      const velocityY = dt > 0 ? (e.clientY - oldest.y) / dt : 0;

      // Written for whichever instance re-renders next with this task id —
      // this one, on a same-lane reorder, or a freshly mounted one in a
      // different lane after a cross-lane move. See settleRegistry.ts.
      registerSettle(task._id, {
        left: e.clientX - s.grabX,
        top: e.clientY - s.grabY,
        velocityX,
        velocityY,
      });
      setIsSettling(true);
    },
    [getLaneElement, user, setDraggingId, task._id],
  );

  // Runs whenever this task's lane or position within its lane could have
  // just changed — a same-lane reorder re-renders this same instance; a
  // cross-lane move unmounts it and mounts a different instance whose first
  // render hits this same effect. Either way, consumeSettle(task._id) is
  // the hand-off finishDrag() above wrote.
  //
  // useLayoutEffect, not useEffect: the invert has to be painted before the
  // browser shows a frame, or there'd be one visible frame at the real
  // (un-offset) position before snapping to the inverted start.
  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const entry = consumeSettle(task._id);
    if (!entry) return;

    const rect = el.getBoundingClientRect();
    const deltaX = entry.left - rect.left;
    const deltaY = entry.top - rect.top;

    // Framer Motion's array-keyframe form paints the first value
    // synchronously, then animates to the second — this is the "start
    // offset, then animate to zero" FLIP invert, without a manual rAF split.
    // X and Y get independent spring instances (apple-design: "decompose 2D
    // motion into independent X and Y springs" — a single spring on a 2D
    // distance desyncs when the two axes carried different velocities).
    const controls = animate(
      el,
      { x: [deltaX, 0], y: [deltaY, 0] },
      {
        x: { ...CARD_SETTLE_SPRING, velocity: entry.velocityX },
        y: { ...CARD_SETTLE_SPRING, velocity: entry.velocityY },
      },
    );
    settleControlsRef.current = controls;
    // .stop() (a new grab interrupting this settle) resolves this same
    // promise early, so guard against a stale completion clearing
    // isSettling after a newer settle has already replaced this one in the
    // ref — otherwise the newer animation's elevation styling would drop
    // mid-flight.
    controls.then(() => {
      if (settleControlsRef.current === controls) setIsSettling(false);
    });
  }, [task._id, task.status, task.laneOrder]);

  const didDrag = useCallback(() => {
    const v = didDragRef.current;
    didDragRef.current = false;
    return v;
  }, []);

  const style: CSSProperties = { touchAction: "none" };
  if (isDragging && flight) {
    style.position = "fixed";
    style.left = flight.left;
    style.top = flight.top;
    style.width = flight.width;
    style.zIndex = "var(--z-drag)";
    style.boxShadow = "var(--lift-3)";
    style.transition = "none";
  } else if (isSettling) {
    // Position and transform are owned by Framer Motion's animate() call in
    // the layout effect above, writing directly to this DOM node — React
    // never sets them, so there is nothing here to fight over. This branch
    // only supplies the elevation that makes the card read as still
    // airborne while it settles into its real (already-correct) flow
    // position, which position:static leaves it in.
    style.zIndex = "var(--z-drag)";
    style.boxShadow = "var(--lift-3)";
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
    isDragging: isDragging || isSettling,
    placeholderHeight,
    didDrag,
  };
}

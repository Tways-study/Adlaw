"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import type { MovableStatus } from "./types";

interface DragContextValue {
  draggingId: Id<"tasks"> | null;
  setDraggingId: (id: Id<"tasks"> | null) => void;
  registerDropLane: (status: MovableStatus, el: HTMLElement | null) => void;
  getLaneElement: (status: MovableStatus) => HTMLElement | null;
}

const DragContext = createContext<DragContextValue | null>(null);

export function useDragContext(): DragContextValue {
  const ctx = useContext(DragContext);
  if (!ctx) throw new Error("useDragContext must be used within DragProvider");
  return ctx;
}

// A lane calls this with its scrollable/droppable container element, e.g.
// `<div className={styles.laneBody} ref={useRegisterDropLane("next")}>`.
export function useRegisterDropLane(status: MovableStatus) {
  const { registerDropLane } = useDragContext();
  return useCallback((el: HTMLElement | null) => registerDropLane(status, el), [registerDropLane, status]);
}

export function DragProvider({ children }: { children: React.ReactNode }) {
  const [draggingId, setDraggingId] = useState<Id<"tasks"> | null>(null);
  const lanesRef = useRef(new Map<MovableStatus, HTMLElement>());

  const registerDropLane = useCallback((status: MovableStatus, el: HTMLElement | null) => {
    if (el) lanesRef.current.set(status, el);
    else lanesRef.current.delete(status);
  }, []);

  const getLaneElement = useCallback((status: MovableStatus) => lanesRef.current.get(status) ?? null, []);

  return (
    <DragContext.Provider value={{ draggingId, setDraggingId, registerDropLane, getLaneElement }}>
      {children}
    </DragContext.Provider>
  );
}

"use client";

import { useDoneToday } from "@/firebase/hooks";
import { EverythingRail } from "@/ui/board/EverythingRail";
import { StartHere } from "@/ui/board/StartHere";
import { ThenQueue } from "@/ui/board/ThenQueue";
import { DoneLane } from "@/ui/board/DoneLane";
import { BoardHeader } from "@/ui/board/BoardHeader";
import { DeleteUndoProvider } from "@/ui/board/DeleteUndoContext";
import { DragProvider } from "@/ui/drag/DragContext";
import { startOfLocalDay } from "@/ui/board/format";
import { CaptureBar } from "@/ui/capture/CaptureBar";
import laneStyles from "@/ui/board/lane.module.css";
import shell from "@/ui/board/shell.module.css";

export default function BoardPage() {
  const doneTasks = useDoneToday(startOfLocalDay());

  // DragProvider must wrap the whole board, not just the lanes: every
  // TaskCard calls useDraggableCard, which calls useDragContext, and the
  // lanes call useRegisterDropLane to hand it their drop targets. Without
  // it every one of those throws "useDragContext must be used within
  // DragProvider" and the route 500s.
  return (
    <DragProvider>
      <DeleteUndoProvider>
        <div className={shell.app}>
          <EverythingRail />
          <main className={shell.day}>
            <BoardHeader />
            <section className={laneStyles.lanes} data-done={Boolean(doneTasks?.length)}>
              <StartHere />
              <ThenQueue />
              <DoneLane tasks={doneTasks ?? []} />
            </section>
          </main>
          <CaptureBar />
        </div>
      </DeleteUndoProvider>
    </DragProvider>
  );
}

"use client";

import { useDoneToday } from "@/firebase/hooks";
import { EverythingRail } from "@/ui/board/EverythingRail";
import { StartHere } from "@/ui/board/StartHere";
import { ThenQueue } from "@/ui/board/ThenQueue";
import { DoneLane } from "@/ui/board/DoneLane";
import { BoardHeader } from "@/ui/board/BoardHeader";
import { DeleteUndoProvider } from "@/ui/board/DeleteUndoContext";
import { FocusProvider } from "@/ui/board/FocusContext";
import { SplitSuggestionProvider } from "@/ui/board/SplitSuggestionContext";
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
  // DragProvider" and the route 500s. FocusProvider and
  // SplitSuggestionProvider need the same board-wide reach — every TaskCard
  // reads useFocus() (M8's reason/"Not this one") and useSplitSuggestion()
  // (M7's quiet breakdown offer), and CaptureBar is the one that calls
  // suggest() on a freshly created task.
  return (
    <DragProvider>
      <DeleteUndoProvider>
        <FocusProvider>
          <SplitSuggestionProvider>
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
          </SplitSuggestionProvider>
        </FocusProvider>
      </DeleteUndoProvider>
    </DragProvider>
  );
}

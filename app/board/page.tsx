"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { EverythingRail } from "@/ui/board/EverythingRail";
import { StartHere } from "@/ui/board/StartHere";
import { ThenQueue } from "@/ui/board/ThenQueue";
import { DoneLane } from "@/ui/board/DoneLane";
import { BoardHeader } from "@/ui/board/BoardHeader";
import { DeleteUndoProvider } from "@/ui/board/DeleteUndoContext";
import { startOfLocalDay } from "@/ui/board/format";
import { CaptureBar } from "@/ui/capture/CaptureBar";
import laneStyles from "@/ui/board/lane.module.css";
import shell from "@/ui/board/shell.module.css";

export default function BoardPage() {
  const doneTasks = useQuery(api.tasks.listDoneToday, { startOfDayMs: startOfLocalDay() });

  return (
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
  );
}

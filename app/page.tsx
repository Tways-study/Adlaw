import { EverythingRail } from "@/ui/board/EverythingRail";
import { StartHere } from "@/ui/board/StartHere";
import { ThenQueue } from "@/ui/board/ThenQueue";
import { DoneLane } from "@/ui/board/DoneLane";
import { BoardHeader } from "@/ui/board/BoardHeader";
import { CaptureBar } from "@/ui/capture/CaptureBar";
import laneStyles from "@/ui/board/lane.module.css";

export default function BoardPage() {
  return (
    <div className="app">
      <EverythingRail />
      <main className="day">
        <BoardHeader />
        <section className={laneStyles.lanes}>
          <StartHere />
          <ThenQueue />
          <DoneLane />
        </section>
      </main>
      <CaptureBar />
    </div>
  );
}

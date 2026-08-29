"use client";

import { useTasksByStatus } from "@/firebase/hooks";
import { TaskCard } from "./TaskCard";
import { SkeletonCard } from "./Skeleton";
import { useFocus } from "./FocusContext";
import { useRegisterDropLane } from "@/ui/drag/DragContext";
import { TodaysShape } from "@/ui/timeline/TodaysShape";
import styles from "./lane.module.css";

// "now" is reachable by drag/keyboard promotion (Slice 3) or a user-
// triggered focus pick (PRD M8, Slice 7) — never automatically on load.
export function StartHere() {
  const tasks = useTasksByStatus("now");
  const dropRef = useRegisterDropLane("now");
  const focus = useFocus();

  return (
    <div className={styles.lane}>
      <div className={styles.laneHead}>
        <h3>Start here</h3>
        <span className={styles.laneHeadMeta}>picked for right now</span>
      </div>
      <div className={styles.laneBody} ref={dropRef}>
        {tasks === undefined ? (
          // At most one "now" task ever exists (firebase/tasks.ts's one-"now"
          // invariant) — one skeleton card matches that, not a guess.
          <SkeletonCard />
        ) : tasks.length > 0 ? (
          tasks.map((task) => <TaskCard key={task._id} task={task} />)
        ) : (
          <div className={styles.emptyFocus}>
            <p className={styles.emptyState}>Nothing queued. Add something, or pull a card from the shelf.</p>
            {focus.canPick && (
              <button className={styles.pickBtn} onClick={focus.pick} disabled={focus.picking}>
                {focus.picking ? "Picking…" : "Pick something to start"}
              </button>
            )}
          </div>
        )}
        {/* Below the focus card, per docs/02-app-flow.md S2's region list —
            "Start here ... Below it, Today's shape." Same column, same
            scroll region, matching docs/design/prototype.html's markup
            (the .shape panel sits inside the "now" lane-body). */}
        <TodaysShape />
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { useTasksByStatus } from "@/firebase/hooks";
import { TaskCard } from "./TaskCard";
import { SkeletonCard } from "./Skeleton";
import { useRegisterDropLane } from "@/ui/drag/DragContext";
import { useDayPlan } from "./useDayPlan";
import { formatClock } from "./format";
import styles from "./lane.module.css";

// Wired for real; resolves empty for the whole of Slice 2 since nothing can
// reach "next" without Slice 3's drag/keyboard movement. See StartHere.tsx.
export function ThenQueue() {
  const tasks = useTasksByStatus("next");
  const plan = useDayPlan();
  // Registering this lane is what makes it a drop target at all —
  // dropDetection's resolveDropTarget skips any lane it wasn't handed an
  // element for. "next" is also the only lane with meaningful ordering
  // (shelf and now both resolve to bare { status }), so without this the
  // beforeId/afterId insertion math never runs for any drop.
  const dropRef = useRegisterDropLane("next");

  // Looked up by task id, not by matching this lane's array index against
  // plan.blocks' index — ThenQueue and useDayPlan each hold their own
  // onSnapshot listener on "next", and id lookup stays correct even if one
  // resolves a tick before the other. spill is exactly the cutIndex
  // boundary (core/capacity.ts's PlannedBlock), so this can never disagree
  // with the capacity slot above it.
  const spillIds = useMemo(() => {
    if (!plan) return null;
    const ids = new Set<string>();
    for (const b of plan.blocks) if (b.spill) ids.add(b.taskId);
    return ids;
  }, [plan]);

  let cutlineDrawn = false;

  return (
    <div className={styles.lane}>
      <div className={styles.laneHead}>
        <h3>Then</h3>
      </div>
      <div className={styles.laneBody} ref={dropRef}>
        {tasks === undefined ? (
          <>
            <SkeletonCard index={0} />
            <SkeletonCard index={1} />
          </>
        ) : tasks.length > 0 ? (
          tasks.map((task) => {
            const isPast = spillIds?.has(task._id) ?? false;
            const drawCutlineHere = isPast && !cutlineDrawn;
            if (drawCutlineHere) cutlineDrawn = true;
            return (
              <div key={task._id}>
                {drawCutlineHere && plan && (
                  <div className={styles.cutline} role="note">
                    <span className={styles.cutlineRule} aria-hidden="true" />
                    <span className={styles.cutlineLabel}>
                      {formatClock(plan.dayEndMin)} — today runs out here
                    </span>
                    <span className={styles.cutlineRule} aria-hidden="true" />
                  </div>
                )}
                <div className={isPast ? styles.past : undefined}>
                  <TaskCard task={task} />
                </div>
              </div>
            );
          })
        ) : (
          <p className={styles.emptyState}>Your day is clear.</p>
        )}
      </div>
    </div>
  );
}

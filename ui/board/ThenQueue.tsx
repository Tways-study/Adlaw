"use client";

import { useTasksByStatus } from "@/firebase/hooks";
import { TaskCard } from "./TaskCard";
import { SkeletonCard } from "./Skeleton";
import { useRegisterDropLane } from "@/ui/drag/DragContext";
import styles from "./lane.module.css";

// Wired for real; resolves empty for the whole of Slice 2 since nothing can
// reach "next" without Slice 3's drag/keyboard movement. See StartHere.tsx.
export function ThenQueue() {
  const tasks = useTasksByStatus("next");
  // Registering this lane is what makes it a drop target at all —
  // dropDetection's resolveDropTarget skips any lane it wasn't handed an
  // element for. "next" is also the only lane with meaningful ordering
  // (shelf and now both resolve to bare { status }), so without this the
  // beforeId/afterId insertion math never runs for any drop.
  const dropRef = useRegisterDropLane("next");

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
          tasks.map((task) => <TaskCard key={task._id} task={task} />)
        ) : (
          <p className={styles.emptyState}>Your day is clear.</p>
        )}
      </div>
    </div>
  );
}

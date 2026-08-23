"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TaskCard } from "./TaskCard";
import { SkeletonCard } from "./Skeleton";
import { useRegisterDropLane } from "@/ui/drag/DragContext";
import styles from "./lane.module.css";

// "now" is reachable by drag/keyboard promotion (Slice 3, this file) or a
// future focus pick (Slice 7).
export function StartHere() {
  const tasks = useQuery(api.tasks.listByStatus, { status: "now" });
  const dropRef = useRegisterDropLane("now");

  return (
    <div className={styles.lane}>
      <div className={styles.laneHead}>
        <h3>Start here</h3>
        <span className={styles.laneHeadMeta}>picked for right now</span>
      </div>
      <div className={styles.laneBody} ref={dropRef}>
        {tasks === undefined ? (
          // At most one "now" task ever exists (convex/tasks.ts's one-"now"
          // invariant) — one skeleton card matches that, not a guess.
          <SkeletonCard />
        ) : tasks.length > 0 ? (
          tasks.map((task) => <TaskCard key={task._id} task={task} />)
        ) : (
          <p className={styles.emptyState}>Nothing queued. Add something, or pull a card from the shelf.</p>
        )}
      </div>
    </div>
  );
}

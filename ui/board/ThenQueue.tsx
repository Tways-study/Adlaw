"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TaskCard } from "./TaskCard";
import { SkeletonCard } from "./Skeleton";
import styles from "./lane.module.css";

// Wired for real; resolves empty for the whole of Slice 2 since nothing can
// reach "next" without Slice 3's drag/keyboard movement. See StartHere.tsx.
export function ThenQueue() {
  const tasks = useQuery(api.tasks.listByStatus, { status: "next" });

  return (
    <div className={styles.lane}>
      <div className={styles.laneHead}>
        <h3>Then</h3>
      </div>
      <div className={styles.laneBody}>
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

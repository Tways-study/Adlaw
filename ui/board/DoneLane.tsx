import type { Task } from "@/core/types";
import { TaskCard } from "./TaskCard";
import styles from "./lane.module.css";

// S2 "Done" lane: "Hidden entirely until the first completion today"
// (docs/02-app-flow.md). Data-driven now — app/page.tsx decides whether it
// renders at all, since that decision also drives the lanes grid's column
// count (lane.module.css's [data-done] rule).
export function DoneLane({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) return null;

  return (
    <div className={styles.lane}>
      <div className={styles.laneHead}>
        <h3>Done</h3>
        <span className={`${styles.laneHeadMeta} num`}>{tasks.length}</span>
      </div>
      <div className={styles.laneBody}>
        {tasks.map((task) => (
          <TaskCard key={task._id} task={task} variant="done" />
        ))}
      </div>
    </div>
  );
}

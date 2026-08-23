"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { TaskCard } from "./TaskCard";
import { SkeletonCard } from "./Skeleton";
import { useRegisterDropLane } from "@/ui/drag/DragContext";
import styles from "./EverythingRail.module.css";

const NO_COURSE_KEY = "__no_course__";

export function EverythingRail() {
  const tasks = useQuery(api.tasks.listByStatus, { status: "shelf" });
  const courses = useQuery(api.tasks.listCourses, {});
  const dropRef = useRegisterDropLane("shelf");

  if (tasks === undefined || courses === undefined) {
    return (
      <aside className={styles.rail}>
        <div className={styles.railHead}>
          <h1>Everything</h1>
        </div>
        <div className={styles.railScroll}>
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} compact index={i} />
          ))}
        </div>
      </aside>
    );
  }

  if (tasks.length === 0) {
    return (
      <aside className={styles.rail}>
        <div className={styles.railHead}>
          <h1>Everything</h1>
        </div>
        <div className={styles.railScroll} ref={dropRef}>
          <p className={styles.emptyState}>Nothing on the shelf. Type a sentence below.</p>
        </div>
      </aside>
    );
  }

  const courseById = new Map<Id<"courses">, Doc<"courses">>(courses.map((c) => [c._id, c]));
  const groups = new Map<string, { label: string; tasks: Doc<"tasks">[] }>();

  for (const task of tasks) {
    const key = task.courseId ?? NO_COURSE_KEY;
    const label = task.courseId ? (courseById.get(task.courseId)?.code ?? "No course") : "No course";
    if (!groups.has(key)) groups.set(key, { label, tasks: [] });
    groups.get(key)!.tasks.push(task);
  }

  const orderedGroups = [...groups.entries()].sort(([a], [b]) => {
    if (a === NO_COURSE_KEY) return 1;
    if (b === NO_COURSE_KEY) return -1;
    return 0;
  });

  return (
    <aside className={styles.rail}>
      <div className={styles.railHead}>
        <h1>Everything</h1>
      </div>
      <div className={styles.railScroll} ref={dropRef}>
        {orderedGroups.map(([key, group]) => (
          <div className={styles.group} key={key}>
            <h2>{group.label}</h2>
            {group.tasks.map((task) => (
              <TaskCard key={task._id} task={task} compact />
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}

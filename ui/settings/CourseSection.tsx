"use client";

import { useState, type KeyboardEvent } from "react";
import { addCourse, renameCourse, retireCourse } from "@/firebase/courses";
import { useAuth, useCourses } from "@/firebase/hooks";
import type { Course } from "@/core/types";
import shared from "./shared.module.css";
import styles from "./CourseSection.module.css";

// PRD M16. Rename edits `code` — the field every consumer
// (EverythingRail.tsx, CaptureBar.tsx, TaskCard.tsx) actually renders and
// matches against on parse; `name` is dead (see the plan's decision).
// Retiring is soft (firebase/courses.ts's retireCourse sets active:false)
// and not as destructive as deleting a task — a plain confirm() is enough,
// no DeleteUndoContext toast needed.
function CourseRow({ uid, course }: { uid: string; course: Course }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(course.code);

  function startEdit() {
    setDraft(course.code);
    setEditing(true);
  }

  function commit() {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== course.code) void renameCourse(uid, course._id, next);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setDraft(course.code);
      setEditing(false);
    }
  }

  function handleRetire() {
    if (window.confirm(`Retire ${course.code}? Existing tasks keep it, but it won't be offered for new ones.`)) {
      void retireCourse(uid, course._id);
    }
  }

  return (
    <li className={styles.row}>
      {editing ? (
        <input
          className={styles.editInput}
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <button type="button" className={styles.codeBtn} onClick={startEdit}>
          {course.code}
        </button>
      )}
      <button type="button" className={styles.retireBtn} onClick={handleRetire}>
        Retire
      </button>
    </li>
  );
}

export function CourseSection() {
  const { user } = useAuth();
  const courses = useCourses();
  const [newCode, setNewCode] = useState("");

  function handleAdd() {
    const code = newCode.trim();
    if (!code || !user) return;
    setNewCode("");
    void addCourse(user.uid, code);
  }

  function handleAddKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleAdd();
  }

  return (
    <section className={shared.section}>
      <h2 className={shared.heading}>Courses</h2>
      <p className={shared.desc}>Click a course to rename it. Retiring keeps it on past tasks but hides it going forward.</p>

      {courses === undefined || !user ? (
        <p className={styles.empty}>Loading…</p>
      ) : courses.length === 0 ? (
        <p className={styles.empty}>No courses yet — add one below, or capture a task that names one.</p>
      ) : (
        <ul className={styles.list}>
          {courses.map((c) => (
            <CourseRow key={c._id} uid={user.uid} course={c} />
          ))}
        </ul>
      )}

      <div className={styles.addRow}>
        <input
          className={styles.addInput}
          placeholder="Add a course (e.g. BIO 210)"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          onKeyDown={handleAddKeyDown}
        />
        <button type="button" className={styles.addBtn} onClick={handleAdd} disabled={!newCode.trim()}>
          Add
        </button>
      </div>
    </section>
  );
}

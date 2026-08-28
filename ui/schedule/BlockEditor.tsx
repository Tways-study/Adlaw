"use client";

import { useState, type ChangeEvent, type FocusEvent } from "react";
import { endBlock, updateBlock } from "@/firebase/schedule";
import { useAuth } from "@/firebase/hooks";
import type { BlockKind, ScheduleBlock } from "@/core/types";
import { minutesToTimeInput, timeInputToMinutes, weekdayName } from "./timeFormat";
import styles from "./BlockEditor.module.css";

const KIND_LABELS: Record<BlockKind, string> = {
  class: "Class",
  work: "Work",
  commute: "Commute",
  other: "Other",
};

const MIN_DURATION = 5;

interface BlockEditorProps {
  block: ScheduleBlock;
  onDeleted: () => void;
}

// Inline, not a modal — the panel is always mounted once a block is
// selected; every field commits on its own change/blur, per S4's "no save
// button" exit behavior. Deleting calls endBlock (activeTo), never a hard
// delete — docs/02-app-flow.md S4.
export function BlockEditor({ block, onDeleted }: BlockEditorProps) {
  const { user } = useAuth();
  // Local echo of start/end text so a half-typed time value isn't clobbered
  // by the next onSnapshot tick before the user finishes editing it.
  const [startText, setStartText] = useState(minutesToTimeInput(block.startMin));
  const [endText, setEndText] = useState(minutesToTimeInput(block.endMin));
  const [labelText, setLabelText] = useState(block.label);

  // Re-sync local text state when a different block is selected.
  const [syncedId, setSyncedId] = useState(block._id);
  if (syncedId !== block._id) {
    setSyncedId(block._id);
    setStartText(minutesToTimeInput(block.startMin));
    setEndText(minutesToTimeInput(block.endMin));
    setLabelText(block.label);
  }

  function commit(patch: Partial<Pick<ScheduleBlock, "weekday" | "startMin" | "endMin" | "label" | "kind">>) {
    if (!user) return;
    void updateBlock(user.uid, block._id, patch);
  }

  function handleWeekdayChange(e: ChangeEvent<HTMLSelectElement>) {
    commit({ weekday: Number(e.target.value) });
  }

  function handleKindChange(e: ChangeEvent<HTMLSelectElement>) {
    commit({ kind: e.target.value as BlockKind });
  }

  function handleStartChange(e: ChangeEvent<HTMLInputElement>) {
    setStartText(e.target.value);
    const minutes = timeInputToMinutes(e.target.value);
    if (minutes === null) return;
    // Keep startMin < endMin true on every write — push the end forward
    // rather than reject the edit, so the invariant firestore.rules enforces
    // never gets a half-applied value in flight.
    const nextEnd = minutes + MIN_DURATION >= block.endMin ? minutes + MIN_DURATION : block.endMin;
    commit({ startMin: minutes, endMin: Math.min(1440, nextEnd) });
  }

  function handleEndChange(e: ChangeEvent<HTMLInputElement>) {
    setEndText(e.target.value);
    const minutes = timeInputToMinutes(e.target.value);
    if (minutes === null) return;
    const nextStart = minutes - MIN_DURATION <= block.startMin ? Math.max(0, minutes - MIN_DURATION) : block.startMin;
    commit({ startMin: nextStart, endMin: minutes });
  }

  function handleLabelBlur(e: FocusEvent<HTMLInputElement>) {
    const trimmed = e.target.value.trim();
    if (trimmed && trimmed !== block.label) commit({ label: trimmed });
    else setLabelText(block.label);
  }

  function handleDelete() {
    if (!user) return;
    void endBlock(user.uid, block._id);
    onDeleted();
  }

  return (
    <div className={styles.panel} aria-label="Edit schedule block">
      <div className={styles.field}>
        <label htmlFor="block-weekday">Day</label>
        <select id="block-weekday" value={block.weekday} onChange={handleWeekdayChange}>
          {Array.from({ length: 7 }, (_, wd) => (
            <option key={wd} value={wd}>
              {weekdayName(wd)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="block-start">Start</label>
          <input id="block-start" type="time" value={startText} onChange={handleStartChange} />
        </div>
        <div className={styles.field}>
          <label htmlFor="block-end">End</label>
          <input id="block-end" type="time" value={endText} onChange={handleEndChange} />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="block-label">Label</label>
        <input
          id="block-label"
          type="text"
          value={labelText}
          onChange={(e) => setLabelText(e.target.value)}
          onBlur={handleLabelBlur}
          placeholder="BIO 210 lecture"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="block-kind">Kind</label>
        <select id="block-kind" value={block.kind} onChange={handleKindChange}>
          {(Object.keys(KIND_LABELS) as BlockKind[]).map((kind) => (
            <option key={kind} value={kind}>
              {KIND_LABELS[kind]}
            </option>
          ))}
        </select>
      </div>

      <button type="button" className={styles.deleteBtn} onClick={handleDelete}>
        Delete block
      </button>
    </div>
  );
}

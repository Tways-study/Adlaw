"use client";

import type { ScheduleBlock } from "@/core/types";
import { formatClock, weekdayName } from "./timeFormat";
import styles from "./WeekGrid.module.css";

const GRID_START_MIN = 360; // 6:00 — a student's schedule rarely starts earlier
const GRID_END_MIN = 1440; // midnight
const PX_PER_MIN = 0.5;
const TOTAL_HEIGHT = (GRID_END_MIN - GRID_START_MIN) * PX_PER_MIN;
const HOUR_MARKS = Array.from(
  { length: (GRID_END_MIN - GRID_START_MIN) / 120 + 1 },
  (_, i) => GRID_START_MIN + i * 120,
);

function topFor(min: number): number {
  return (Math.max(GRID_START_MIN, Math.min(GRID_END_MIN, min)) - GRID_START_MIN) * PX_PER_MIN;
}

function heightFor(startMin: number, endMin: number): number {
  const top = topFor(startMin);
  const bottom = topFor(endMin);
  return Math.max(18, bottom - top);
}

interface WeekGridProps {
  blocks: ScheduleBlock[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (weekday: number) => void;
}

// The week grid — S4's editable view of scheduleBlocks. Positions blocks by
// clock time within each weekday column; clicking one selects it for
// BlockEditor, clicking "+ Add" creates a new block on that day (with
// sensible defaults) and selects it immediately, since S4's exit behavior
// has no separate "new block" form — the created block IS the editable form.
export function WeekGrid({ blocks, selectedId, onSelect, onAdd }: WeekGridProps) {
  const byWeekday: ScheduleBlock[][] = Array.from({ length: 7 }, (_, wd) =>
    blocks.filter((b) => b.weekday === wd).sort((a, b) => a.startMin - b.startMin),
  );

  return (
    <div className={styles.grid}>
      <div className={styles.gutter} style={{ height: TOTAL_HEIGHT }}>
        {HOUR_MARKS.map((m) => (
          <span key={m} className={styles.hourMark} style={{ top: topFor(m) }}>
            {formatClock(m)}
          </span>
        ))}
      </div>
      {byWeekday.map((dayBlocks, wd) => (
        <div className={styles.dayCol} key={wd}>
          <div className={styles.dayHead}>
            <span>{weekdayName(wd)}</span>
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => onAdd(wd)}
              aria-label={`Add block on ${weekdayName(wd)}`}
            >
              +
            </button>
          </div>
          <div className={styles.dayBody} style={{ height: TOTAL_HEIGHT }}>
            {dayBlocks.length === 0 && <p className={styles.emptyState}>No blocks</p>}
            {dayBlocks.map((b) => (
              <button
                type="button"
                key={b._id}
                className={styles.block}
                style={{ top: topFor(b.startMin), height: heightFor(b.startMin, b.endMin) }}
                onClick={() => onSelect(b._id)}
                aria-pressed={b._id === selectedId}
              >
                <span className={styles.blockLabel}>{b.label || "Untitled"}</span>
                <span className={styles.blockTime}>
                  {formatClock(b.startMin)}–{formatClock(b.endMin)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

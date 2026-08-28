"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { create } from "@/firebase/tasks";
import { useAuth, useScheduleBlocks } from "@/firebase/hooks";
import { parseHeuristic } from "@/core/heuristic";
import { formatEstimate, formatDue } from "@/ui/board/format";
import styles from "./CaptureBar.module.css";

export function CaptureBar() {
  const [value, setValue] = useState("");
  const { user } = useAuth();
  const scheduleBlocks = useScheduleBlocks();
  const inputRef = useRef<HTMLInputElement>(null);

  // S3's first run: "capture is pre-focused" when zero schedule blocks
  // exist — not a wizard, just this one autofocus. Fires once, the first
  // time scheduleBlocks resolves from undefined to a real array, so it
  // never steals focus back after the user has clicked elsewhere (e.g.
  // once they've gone to set up the schedule and returned).
  const hasAutoFocused = useRef(false);
  useEffect(() => {
    if (hasAutoFocused.current || scheduleBlocks === undefined) return;
    hasAutoFocused.current = true;
    if (scheduleBlocks.length === 0) inputRef.current?.focus();
  }, [scheduleBlocks]);

  const preview = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    // The live preview reads the wall clock to resolve relative dates
    // ("thursday", "in 9 days") — a per-keystroke display value, not
    // component state.
    // eslint-disable-next-line react-hooks/purity
    return parseHeuristic(trimmed, Date.now());
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const rawText = value.trim();
    if (!rawText) return;

    const parsed = preview ?? parseHeuristic(rawText, Date.now());
    if (user) {
      void create(user.uid, {
        rawText,
        title: parsed.title,
        courseCode: parsed.courseCode,
        estimateMin: parsed.estimateMin,
        dueAt: parsed.dueAt,
        parseState: "fallback",
      });
    }
    setValue("");
  }

  return (
    <div className={styles.capture}>
      {preview && (
        <div className={styles.parsed}>
          {preview.courseCode && <span className={styles.chip}>{preview.courseCode}</span>}
          <span className={styles.chip}>{formatEstimate(preview.estimateMin)}</span>
          {/* eslint-disable-next-line react-hooks/purity -- see preview useMemo above */}
          {preview.dueAt && <span className={styles.chip}>{formatDue(preview.dueAt, Date.now())}</span>}
        </div>
      )}
      <div className={styles.inner}>
        <input
          ref={inputRef}
          placeholder="finish bio lab report by thursday"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <span className={styles.hint}>
          <kbd>↩</kbd> to capture
        </span>
      </div>
    </div>
  );
}

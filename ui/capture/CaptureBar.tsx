"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { parseHeuristic } from "@/core/heuristic";
import { formatEstimate, formatDue } from "@/ui/board/format";
import styles from "./CaptureBar.module.css";

export function CaptureBar() {
  const [value, setValue] = useState("");
  const create = useMutation(api.tasks.create);

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
    void create({
      rawText,
      title: parsed.title,
      courseCode: parsed.courseCode,
      estimateMin: parsed.estimateMin,
      dueAt: parsed.dueAt,
      parseState: "fallback",
    });
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

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { create } from "@/firebase/tasks";
import { requestParse } from "@/firebase/ai";
import { useAuth, useCourses, usePrefs, useScheduleBlocks } from "@/firebase/hooks";
import { parseHeuristic } from "@/core/heuristic";
import { useSplitSuggestion } from "@/ui/board/SplitSuggestionContext";
import { formatEstimate, formatDue } from "@/ui/board/format";
import styles from "./CaptureBar.module.css";

export function CaptureBar() {
  const [value, setValue] = useState("");
  const { user } = useAuth();
  const scheduleBlocks = useScheduleBlocks();
  const courses = useCourses();
  const prefs = usePrefs();
  const { suggest } = useSplitSuggestion();
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

    // Cleared immediately, before the AI call resolves — capture never
    // blocks the input (CLAUDE.md). The next sentence can be typed while
    // this one is still in flight; nothing here waits on it.
    setValue("");
    if (!user) return;
    const uid = user.uid;
    const courseCodes = courses?.map((c) => c.code);
    const now = Date.now();

    // requestParse always resolves — network failure, a non-2xx response,
    // and the Route Handler's own Gemini-to-heuristic fallback all still
    // produce a usable ParsedTask (see firebase/ai.ts) — so the card is
    // created unconditionally either way. `submitting` is real (the capture
    // state machine's own name for this gap, docs/02-app-flow.md), just
    // never shown as a spinner/modal: the only visible effect is the input
    // clearing above and the card appearing once this resolves.
    void (async () => {
      const { result, log } = await requestParse(uid, rawText, now, courseCodes, {
        aiProvider: prefs?.aiProvider,
        aiModel: prefs?.aiModel,
      });
      const taskId = await create(uid, {
        rawText,
        title: result.title,
        courseCode: result.courseCode,
        estimateMin: result.estimateMin,
        dueAt: result.dueAt,
        parseState: log.ok ? "ok" : "fallback",
      });
      // PRD M7: "Triggered when the parse flags shouldSplit, or on demand."
      // A quiet, dismissible offer — ui/board/TaskCard.tsx reads this and
      // never forces the breakdown.
      if (result.shouldSplit) suggest(taskId);
    })();
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

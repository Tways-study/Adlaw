"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePrefs, useScheduleBlocks } from "@/firebase/hooks";
import { useDayPlan } from "@/ui/board/useDayPlan";
import { formatClock } from "@/ui/board/format";
import type { Task } from "@/core/types";
import styles from "./TodaysShape.module.css";

// Persists across sessions, scoped to this feature only — see readDismissed's
// try/catch below for why this can never throw up into the render path.
const CALENDAR_PROMPT_DISMISSED_KEY = "adlaw:todays-shape:calendar-prompt-dismissed";

// Some privacy modes (Safari private browsing under storage pressure, some
// locked-down enterprise profiles) throw on any localStorage access, not
// just quota errors. A dismiss button that occasionally can't remember its
// own state is an acceptable degrade; a crashed board is not.
function readCalendarPromptDismissed(): boolean {
  try {
    return window.localStorage.getItem(CALENDAR_PROMPT_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCalendarPromptDismissed() {
  try {
    window.localStorage.setItem(CALENDAR_PROMPT_DISMISSED_KEY, "1");
  } catch {
    // See readCalendarPromptDismissed — losing the dismissal for this
    // session is fine, throwing is not.
  }
}

// Below this span the hourly gridlines and gutter labels would crowd past
// legibility, so short days (everything already done, day edge minutes away)
// still get a readable minimum canvas.
const MIN_RANGE_MIN = 240;

function roundRangeDown(min: number): number {
  return Math.floor(min / 60) * 60;
}

function roundRangeUp(min: number): number {
  return Math.ceil(min / 60) * 60;
}

interface Marks {
  rangeStart: number;
  rangeEnd: number;
  span: number;
  hourStep: number;
  hourMarks: number[];
}

function computeMarks(
  nowMin: number,
  dayEndMin: number,
  busyStarts: number[],
  busyEnds: number[],
  blockStarts: number[],
  blockEnds: number[],
): Marks {
  const starts = [nowMin, dayEndMin, ...busyStarts, ...blockStarts];
  const ends = [nowMin, dayEndMin, ...busyEnds, ...blockEnds];

  const rangeStart = roundRangeDown(Math.min(...starts));
  let rangeEnd = roundRangeUp(Math.max(...ends));
  if (rangeEnd - rangeStart < MIN_RANGE_MIN) rangeEnd = rangeStart + MIN_RANGE_MIN;

  const span = rangeEnd - rangeStart;
  const hourStep = span > 6 * 60 ? 120 : 60;

  const hourMarks: number[] = [];
  const first = Math.ceil(rangeStart / hourStep) * hourStep;
  for (let m = first; m <= rangeEnd; m += hourStep) hourMarks.push(m);

  return { rangeStart, rangeEnd, span, hourStep, hourMarks };
}

function pctOf(min: number, rangeStart: number, span: number): number {
  return ((min - rangeStart) / span) * 100;
}

/**
 * "Today's shape" (S5) — the day's committed and planned time, side by side,
 * with a now-line and a day-edge line. Reads useDayPlan() exclusively for
 * every minute figure; the only other Firebase read here is
 * useScheduleBlocks(), used solely to tell "no schedule at all" (S3's first-
 * run trigger) apart from "no committed time today because today happens to
 * be free" — a distinction useDayPlan()'s busyIntervals can't make on its
 * own, since an empty array means both things.
 */
export function TodaysShape() {
  const plan = useDayPlan();
  const blocks = useScheduleBlocks();
  const prefs = usePrefs();

  const [calendarPromptDismissed, setCalendarPromptDismissed] = useState(true);
  useEffect(() => {
    // One-shot sync from localStorage (an external system, read once on
    // mount) — not a cascading-render risk.
    const dismissed = readCalendarPromptDismissed();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!dismissed) setCalendarPromptDismissed(false);
  }, []);

  const taskById = useMemo(() => {
    const map = new Map<string, Task>();
    if (plan) for (const task of plan.queue) map.set(task._id, task);
    return map;
  }, [plan]);

  if (plan === undefined || blocks === undefined) {
    return (
      <div className={styles.shape}>
        <div className={styles.head}>
          <h4>Today&rsquo;s shape</h4>
        </div>
        <div className={styles.skeleton} aria-hidden="true" />
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className={styles.shape}>
        <div className={styles.head}>
          <h4>Today&rsquo;s shape</h4>
        </div>
        <p className={styles.emptyPanel}>
          <Link href="/schedule" className={styles.emptyLink}>
            No schedule yet — set one up
          </Link>
        </p>
      </div>
    );
  }

  // Cheap pure arithmetic over small arrays — recomputed each render rather
  // than memoized, same call-shape as the rest of ui/ (e.g. CaptureBar's
  // parseHeuristic preview).
  const { rangeStart, span, hourStep, hourMarks } = computeMarks(
    plan.nowMin,
    plan.dayEndMin,
    plan.busyIntervals.map((b) => b.startMin),
    plan.busyIntervals.map((b) => b.endMin),
    plan.blocks.map((b) => b.startMin),
    plan.blocks.map((b) => b.endMin),
  );
  const pct = (min: number) => pctOf(min, rangeStart, span);
  const gridPercentPerHour = (hourStep / span) * 100;

  return (
    <div className={styles.shape}>
      <div className={styles.head}>
        <h4>Today&rsquo;s shape</h4>
        <span>your weekly schedule</span>
      </div>

      {prefs && !prefs.googleConnectedAt && !calendarPromptDismissed && (
        <div className={styles.callout} role="note">
          <span className={styles.calloutText}>
            <Link href="/settings" className={styles.calloutLink}>
              Connect Google Calendar
            </Link>{" "}
            to see events here too.
          </span>
          <button
            type="button"
            className={styles.calloutDismiss}
            onClick={() => {
              writeCalendarPromptDismissed();
              setCalendarPromptDismissed(true);
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Cross-cutting state (docs/02-app-flow.md): "Calendar sync stale or
          failed" gets its detailed state in S7 (Settings) and a quiet prompt
          here. Not gated by calendarPromptDismissed/localStorage — that
          dismissal is for the disconnected invite, not an active problem,
          so this one always shows while the condition holds. */}
      {prefs?.googleConnectedAt && (prefs.googleSyncStatus === "expired" || prefs.googleSyncStatus === "error") && (
        <div className={styles.callout} role="note">
          <span className={styles.calloutText}>
            {prefs.googleSyncStatus === "expired" ? (
              <>
                Google Calendar connection expired —{" "}
                <Link href="/settings" className={styles.calloutLink}>
                  reconnect
                </Link>
                .
              </>
            ) : (
              <>
                Google Calendar didn&rsquo;t sync last time —{" "}
                <Link href="/settings" className={styles.calloutLink}>
                  check Settings
                </Link>
                .
              </>
            )}
          </span>
        </div>
      )}

      <div className={styles.tl} aria-hidden="true">
        <div className={styles.gut}>
          {hourMarks.map((m) => (
            <b key={m} className="num" style={{ top: `${pct(m)}%` }}>
              {formatClock(m)}
            </b>
          ))}
        </div>

        <div className={styles.col} style={{ backgroundSize: `100% ${gridPercentPerHour}%` }}>
          <span className={styles.colLabel}>Committed</span>
          {plan.busyIntervals.map((iv, i) => (
            <div
              key={`${iv.startMin}-${iv.endMin}-${i}`}
              className={styles.blkFixed}
              style={{ top: `${pct(iv.startMin)}%`, height: `${Math.max(pct(iv.endMin) - pct(iv.startMin), 3)}%` }}
            >
              <span className={styles.blkTitle}>{iv.label}</span>
              <span className={`${styles.blkTime} num`}>
                {formatClock(iv.startMin)}–{formatClock(iv.endMin)}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.col} style={{ backgroundSize: `100% ${gridPercentPerHour}%` }}>
          <span className={styles.colLabel}>Planned</span>
          {plan.blocks.map((b) => {
            const task = taskById.get(b.taskId);
            return (
              <div
                key={b.taskId}
                className={b.spill ? styles.blkSpill : styles.blkPlan}
                style={{ top: `${pct(b.startMin)}%`, height: `${Math.max(pct(b.endMin) - pct(b.startMin), 3)}%` }}
              >
                <span className={styles.blkTitle}>{task?.title ?? "Untitled task"}</span>
                <span className={`${styles.blkTime} num`}>
                  {formatClock(b.startMin)}–{formatClock(b.endMin)}
                  {b.spill ? " · past today's edge" : ""}
                </span>
              </div>
            );
          })}
        </div>

        <div className={styles.nowline} style={{ top: `${pct(plan.nowMin)}%` }} />
        <div className={styles.endline} style={{ top: `${pct(plan.dayEndMin)}%` }} />
      </div>

      {/* Same information as the diagram above, read order rather than
          spatial layout — the diagram is a visual encoding of this, not the
          other way around. */}
      <div className={styles.srOnly}>
        <p>
          Now is {formatClock(plan.nowMin)}. Today runs out at {formatClock(plan.dayEndMin)}.
        </p>
        <p>Committed:</p>
        {plan.busyIntervals.length === 0 ? (
          <p>Nothing committed today.</p>
        ) : (
          <ul>
            {plan.busyIntervals.map((iv, i) => (
              <li key={`${iv.startMin}-${iv.endMin}-${i}`}>
                {iv.label}, {formatClock(iv.startMin)} to {formatClock(iv.endMin)}
              </li>
            ))}
          </ul>
        )}
        <p>Planned:</p>
        {plan.blocks.length === 0 ? (
          <p>Nothing planned yet.</p>
        ) : (
          <ul>
            {plan.blocks.map((b) => {
              const task = taskById.get(b.taskId);
              return (
                <li key={b.taskId}>
                  {task?.title ?? "Untitled task"}, {formatClock(b.startMin)} to {formatClock(b.endMin)}
                  {b.spill ? " — runs past today's edge" : ""}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

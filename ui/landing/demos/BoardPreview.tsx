import { Fragment } from "react";
import { formatEstimate } from "@/ui/board/format";
import { BOARD_PREVIEW, CAPACITY_OVER, previewCutIndex, type PreviewTask } from "../copy";
import styles from "./demos.module.css";

// The hero's one piece of imagery: a still of the real board, in the Linear
// reference's product-UI-as-imagery idiom. It's a static reproduction, not
// the board — every ui/board/ component is "use client" + a Firestore
// listener that never resolves for a signed-out visitor.
//
// It depicts only what's built: the three lanes, the capacity slot, and the
// cutline. No AI reason line. The picture itself is aria-hidden; one sentence
// carries what it shows, because reading every miniature card aloud would be
// noise.

const { rail, focus, queue, cutLabel } = BOARD_PREVIEW;
const cutIndex = previewCutIndex(CAPACITY_OVER.freeMin);

// Over capacity, so planned is the longer of the two and sets the track's
// scale; the notch sits where free time ends.
const notchPct = (CAPACITY_OVER.freeMin / CAPACITY_OVER.plannedMin) * 100;

function PreviewCard({ task, isFocus, past }: { task: PreviewTask; isFocus?: boolean; past?: boolean }) {
  const cls = [styles.card, isFocus ? styles.focus : null, past ? styles.bpPast : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls}>
      {task.courseCode && <span className={styles.course}>{task.courseCode}</span>}
      <p className={isFocus ? styles.focusTitle : styles.bpCardTitle}>{task.title}</p>
      <div className={styles.meta}>
        <span className="num">{formatEstimate(task.estimateMin)}</span>
        {task.due && (
          <>
            <span className={styles.dot} />
            <span>{task.due}</span>
          </>
        )}
      </div>
    </div>
  );
}

export function BoardPreview() {
  const pastCount = cutIndex === -1 ? 0 : queue.length - cutIndex;

  return (
    <figure className={styles.bp}>
      <div className={styles.bpWindow} aria-hidden="true">
        <div className={styles.bpRail}>
          <span className={styles.bpLaneHead}>Everything</span>
          {rail.map((t) => (
            <div key={t.title} className={styles.bpRailItem}>
              <span className={styles.course}>{t.courseCode}</span>
              <span>{t.title}</span>
            </div>
          ))}
        </div>

        <div className={styles.bpDay}>
          <div className={styles.bpBar}>
            <span className={styles.bpToday}>Today</span>
            <div className={styles.bpCap}>
              <div className={styles.capTop}>
                <span>
                  <span className="num">{CAPACITY_OVER.free}</span> free ·{" "}
                  <span className="num">{CAPACITY_OVER.planned}</span> planned
                </span>
                <span className={styles.over}>
                  <span className="num">{CAPACITY_OVER.delta}</span> over
                </span>
              </div>
              <div className={styles.slot}>
                <span className={styles.fill} style={{ width: `${notchPct}%` }} />
                <span
                  className={styles.spill}
                  style={{ left: `${notchPct}%`, width: `${100 - notchPct}%` }}
                />
                <span className={styles.notch} style={{ left: `${notchPct}%` }} />
              </div>
            </div>
          </div>

          <div className={styles.bpLanes}>
            <div className={styles.bpLane}>
              <span className={styles.bpLaneHead}>Start here</span>
              <PreviewCard task={focus} isFocus />
            </div>
            <div className={styles.bpLane}>
              <span className={styles.bpLaneHead}>Then</span>
              {queue.map((t, i) => (
                <Fragment key={t.title}>
                  {i === cutIndex && (
                    <div className={styles.bpCut}>
                      <span className={styles.bpCutRule} />
                      <span className={styles.edgeLabel}>{cutLabel}</span>
                    </div>
                  )}
                  <PreviewCard task={t} past={cutIndex !== -1 && i >= cutIndex} />
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
      <figcaption className={styles.srOnly}>
        The Adlaw board: one task to start now, four queued after it, and a line where today runs
        out — {pastCount} of them fall past it, {CAPACITY_OVER.delta} over.
      </figcaption>
    </figure>
  );
}

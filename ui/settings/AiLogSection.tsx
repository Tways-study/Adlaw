"use client";

import { useAiLog } from "@/firebase/hooks";
import shared from "./shared.module.css";
import styles from "./AiLogSection.module.css";

const MAX_ROWS = 50;

function formatWhen(createdAt: number): string {
  return new Date(createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// docs/03-backend-schema.md's "the only honest measure of whether the core
// promise works" — a read-only review list, newest first (useAiLog's own
// query already orders by createdAt desc). aiLog can grow indefinitely, so
// this slices client-side to the most recent MAX_ROWS rather than adding a
// Firestore limit() (useAiLog's signature is fixed, out of scope here).
export function AiLogSection() {
  const entries = useAiLog();
  const rows = entries?.slice(0, MAX_ROWS);

  return (
    <section className={shared.section}>
      <h2 className={shared.heading}>AI activity</h2>
      <p className={shared.desc}>Recent parses, breakdowns, and focus picks, and whether each needed to fall back.</p>

      {entries === undefined ? (
        <p className={styles.empty}>Loading…</p>
      ) : rows && rows.length === 0 ? (
        <p className={styles.empty}>Nothing logged yet — capture a task to see it here.</p>
      ) : (
        <ul className={styles.list}>
          {rows?.map((entry) => (
            <li key={entry._id} className={styles.row}>
              <div className={styles.rowMain}>
                <span className={styles.kind}>{entry.kind}</span>
                <span className={styles.provider}>{entry.provider}</span>
                {!entry.ok && <span className={styles.fallback}>fallback</span>}
              </div>
              <span className={`${styles.meta} num`}>
                {entry.latencyMs}ms · {formatWhen(entry.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { createBlock } from "@/firebase/schedule";
import { useAuth, usePrefs, useScheduleBlocks } from "@/firebase/hooks";
import { BlockEditor } from "@/ui/schedule/BlockEditor";
import { DayEndControl } from "@/ui/schedule/DayEndControl";
import { WeekGrid } from "@/ui/schedule/WeekGrid";
import styles from "./page.module.css";

// A new block is created with these defaults the instant "+ Add" is
// pressed — S4 has no separate "new block" form; the created block is
// immediately selected and IS the editable form (BlockEditor).
const DEFAULT_NEW_BLOCK = { startMin: 540, endMin: 600, kind: "class" as const, label: "New block" };

export default function SchedulePage() {
  const { user } = useAuth();
  const blocksRaw = useScheduleBlocks();
  const prefs = usePrefs();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Ended blocks (activeTo set) are history, not the editable set this route
  // shows — core/time.ts still selects them correctly for any date before
  // they ended; this view just doesn't offer them for further editing.
  const blocks = (blocksRaw ?? []).filter((b) => b.activeTo === undefined);
  const selected = blocks.find((b) => b._id === selectedId) ?? null;

  async function handleAdd(weekday: number) {
    if (!user) return;
    const id = await createBlock(user.uid, { weekday, ...DEFAULT_NEW_BLOCK });
    setSelectedId(id);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Schedule</h1>
          <Link href="/board" className={styles.backLink}>
            Back to board
          </Link>
        </div>
        <DayEndControl dayEndMin={prefs?.dayEndMin} />
      </header>

      <div className={styles.body}>
        <div className={styles.gridWrap}>
          {blocksRaw === undefined ? (
            <p className={styles.loading}>Loading your schedule…</p>
          ) : (
            <WeekGrid blocks={blocks} selectedId={selectedId} onSelect={setSelectedId} onAdd={handleAdd} />
          )}
        </div>
        <aside className={styles.editorWrap}>
          {selected ? (
            <BlockEditor key={selected._id} block={selected} onDeleted={() => setSelectedId(null)} />
          ) : (
            <p className={styles.hint}>Select a block to edit it, or add one from a day column above.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

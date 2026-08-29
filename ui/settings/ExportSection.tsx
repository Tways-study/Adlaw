"use client";

import { useState } from "react";
import { exportAllData } from "@/firebase/export";
import { useAuth } from "@/firebase/hooks";
import shared from "./shared.module.css";
import styles from "./ExportSection.module.css";

type ExportState = "idle" | "pending" | "done";

// PRD M18's data export surface. exportAllData does five sequential getDocs
// reads before it can trigger the download, so this shows a brief pending
// state rather than leaving the button looking inert during that gap.
export function ExportSection() {
  const { user } = useAuth();
  const [state, setState] = useState<ExportState>("idle");

  async function handleExport() {
    if (!user || state === "pending") return;
    setState("pending");
    try {
      await exportAllData(user.uid);
      setState("done");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("idle");
    }
  }

  return (
    <section className={shared.section}>
      <h2 className={shared.heading}>Export your data</h2>
      <p className={shared.desc}>
        Downloads every task, course, schedule block, AI log entry, and preference as one JSON file.
      </p>
      <button type="button" className={styles.exportBtn} onClick={() => void handleExport()} disabled={state === "pending"}>
        {state === "pending" ? "Preparing…" : state === "done" ? "Downloaded" : "Download my data"}
      </button>
    </section>
  );
}

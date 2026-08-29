"use client";

import { useEffect, useState } from "react";
import { setAiPreference } from "@/firebase/settings";
import { useAuth, usePrefs } from "@/firebase/hooks";
import shared from "./shared.module.css";
import styles from "./AiProviderSection.module.css";

interface StatusResult {
  available: boolean;
  model: string;
}

// PRD M18's provider selection screen. `prefs.aiProvider` is a real
// per-request override — firebase/ai.ts's requestParse/requestBreakdown/
// requestFocus send it on every call, and ai/index.ts's getProviderInfo()
// honors it ahead of the env-var default (see the plan's "AI provider
// selection is a real per-request override, not a status display"
// decision). The GET /api/ai/status probe is a presence check, not a
// Gemini call — it costs nothing against the shared free-tier key.
export function AiProviderSection() {
  const { user } = useAuth();
  const prefs = usePrefs();
  const [status, setStatus] = useState<StatusResult | null>(null);
  const [statusError, setStatusError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/status")
      .then((res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json() as Promise<StatusResult>;
      })
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatusError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Undefined prefs (not yet loaded) or an absent aiProvider field both mean
  // "no preference set" — Gemini is the implicit default when a key exists,
  // matching ai/index.ts's own resolution when no override is sent.
  const selected = prefs?.aiProvider === "heuristic" ? "heuristic" : "gemini";

  function handleSelect(provider: "gemini" | "heuristic") {
    if (!user) return;
    void setAiPreference(user.uid, provider, prefs?.aiModel);
  }

  function handleModelChange(model: string) {
    if (!user) return;
    void setAiPreference(user.uid, "gemini", model || undefined);
  }

  // A model field only makes sense once Gemini is both selected and actually
  // available server-side — offering it otherwise invites a user to type a
  // model name that can never be reached.
  const showModelField = selected === "gemini" && status?.available === true;

  let statusText: string;
  if (statusError) {
    statusText = "Couldn't reach the AI status check — using the heuristic parser.";
  } else if (status === null) {
    statusText = "Checking Gemini availability…";
  } else if (status.available) {
    statusText = `Gemini is configured (${status.model}).`;
  } else {
    statusText = "No Gemini key configured — using the heuristic parser.";
  }

  return (
    <section className={shared.section}>
      <h2 className={shared.heading}>AI parsing</h2>
      <p className={shared.desc}>
        Choose what turns a captured sentence into a task. The heuristic parser always works offline and
        without a key.
      </p>

      <div className={styles.choices} role="radiogroup" aria-label="AI provider">
        <label className={styles.choice}>
          <input
            type="radio"
            name="ai-provider"
            checked={selected === "gemini"}
            onChange={() => handleSelect("gemini")}
          />
          <span>
            <span className={styles.choiceTitle}>Gemini</span>
            <span className={styles.choiceHint}>Better structuring, falls back automatically if unavailable.</span>
          </span>
        </label>
        <label className={styles.choice}>
          <input
            type="radio"
            name="ai-provider"
            checked={selected === "heuristic"}
            onChange={() => handleSelect("heuristic")}
          />
          <span>
            <span className={styles.choiceTitle}>Heuristic only</span>
            <span className={styles.choiceHint}>Rules-based parsing. Never calls Gemini for this account.</span>
          </span>
        </label>
      </div>

      {showModelField && (
        <label className={styles.modelField}>
          <span className={styles.modelLabel}>Model</span>
          <input
            type="text"
            defaultValue={prefs?.aiModel ?? ""}
            placeholder={status?.model}
            onBlur={(e) => handleModelChange(e.target.value.trim())}
          />
        </label>
      )}

      <p className={styles.status}>{statusText}</p>
    </section>
  );
}

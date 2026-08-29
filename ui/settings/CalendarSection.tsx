"use client";

import { useEffect, useState } from "react";
import { disconnect, triggerSync } from "@/firebase/calendar";
import { useAuth, usePrefs } from "@/firebase/hooks";
import shared from "./shared.module.css";
import styles from "./CalendarSection.module.css";

type SyncState = "idle" | "pending";

// ../../app/api/calendar/callback/route.ts's exit query params — every path
// through that route redirects to /settings with one of these rather than
// throwing, so this is the full set this component needs to translate.
const CALLBACK_MESSAGES: Record<string, string> = {
  calendarConnected_1: "Google Calendar connected.",
  calendarConnected_cancelled: "Connection cancelled — Google Calendar wasn't connected.",
  calendarError_not_configured: "Google Calendar isn't set up for this app yet.",
  calendarError_invalid_state: "That connection attempt couldn't be verified — try again.",
  calendarError_exchange_failed: "Google didn't confirm the connection — try again.",
};

function formatSyncedAt(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// S7 (docs/02-app-flow.md). Three states driven by settings/prefs' google*
// fields (usePrefs, live via onSnapshot — a completed OAuth callback or sync
// updates this panel with no reload): disconnected, connected, and sync
// failed/expired. The callback's one-time query params are read directly off
// window.location rather than next/navigation's useSearchParams, which would
// force a Suspense boundary onto this whole client page for a value only
// this section needs.
export function CalendarSection() {
  const { user } = useAuth();
  const prefs = usePrefs();
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("calendarConnected");
    const error = params.get("calendarError");
    const key = connected ? `calendarConnected_${connected}` : error ? `calendarError_${error}` : null;
    if (!key) return;
    // One-shot sync from window.location (an external system, read once on
    // mount) — not a cascading-render risk, same pattern as
    // ui/timeline/TodaysShape.tsx's localStorage read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotice(CALLBACK_MESSAGES[key] ?? "Something went wrong connecting Google Calendar.");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function handleSync() {
    if (!user || syncState === "pending") return;
    setSyncState("pending");
    setNotice(null);
    try {
      const result = await triggerSync();
      if (result.status === "not_connected") {
        setNotice("Not connected — connect Google Calendar first.");
      }
    } catch {
      setNotice("Couldn't reach the sync service — try again.");
    } finally {
      setSyncState("idle");
    }
  }

  function handleDisconnect() {
    if (!user) return;
    if (!window.confirm("Disconnect Google Calendar? Cached events will be removed — your schedule and board are unaffected.")) {
      return;
    }
    void disconnect(user.uid);
  }

  if (prefs === undefined) {
    return (
      <section className={shared.section}>
        <h2 className={shared.heading}>Google Calendar</h2>
        <p className={styles.empty}>Loading…</p>
      </section>
    );
  }

  const connected = Boolean(prefs.googleConnectedAt);

  return (
    <section className={shared.section}>
      <h2 className={shared.heading}>Google Calendar</h2>
      <p className={shared.desc}>
        Read-only. Events show alongside your schedule to sharpen capacity — nothing is ever written back to Google.
      </p>

      {notice && <p className={styles.notice}>{notice}</p>}

      {!connected ? (
        <a className={styles.connectBtn} href="/api/calendar/connect">
          Connect Google Calendar
        </a>
      ) : (
        <>
          {/* Text-based, not a color signal — DESIGN.md reserves --alert for
              "past the edge of the day," nothing else (see AiLogSection's
              .fallback badge for the same reasoning). A degraded sync state
              is carried by the sentence itself, on the same neutral ink as
              the connected message above it. */}
          <p className={styles.statusLine}>
            {prefs.googleSyncStatus === "expired"
              ? "Google says this connection expired — reconnect to keep events syncing."
              : prefs.googleSyncStatus === "error"
                ? "The last sync didn't go through. The board still works from your manual schedule."
                : prefs.googleLastSyncedAt
                  ? `Last synced ${formatSyncedAt(prefs.googleLastSyncedAt)}.`
                  : "Connected — not synced yet."}
          </p>

          <div className={styles.actions}>
            {prefs.googleSyncStatus === "expired" ? (
              <a className={styles.connectBtn} href="/api/calendar/connect">
                Reconnect
              </a>
            ) : (
              <button type="button" className={styles.syncBtn} onClick={() => void handleSync()} disabled={syncState === "pending"}>
                {syncState === "pending" ? "Syncing…" : "Sync now"}
              </button>
            )}
            <button type="button" className={styles.disconnectBtn} onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>
        </>
      )}
    </section>
  );
}

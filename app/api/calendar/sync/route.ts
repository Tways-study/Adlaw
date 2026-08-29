// "Sync now" / focus-revalidation (docs/04-tdd.md §Calendar integration,
// PRD M13). POST because this mutates calendarCache, consistent with every
// app/api/ai/* route also being POST. Never throws to the browser: on any
// failure short of a truly unhandled bug, calendarCache is left exactly as
// it was and the caller gets a status string to act on — capacity always
// has a value from the manual schedule regardless of what this route
// returns (core/time.ts's freeWindows degrades silently on a stale/empty
// cache).

import { NextRequest, NextResponse } from "next/server";
import { UID_HEADER } from "@/sessionHeader";
import { decryptToken } from "../_tokenCrypto";
import { restGetDoc, restPatchDoc, restListDocNames, restBatchWrite, type BatchWrite } from "../_firestoreRest";

export const runtime = "nodejs";

// docs/03-backend-schema.md / docs/04-tdd.md: fetch events for
// [today, today+14d].
const SYNC_WINDOW_DAYS = 14;

interface GoogleEvent {
  id: string;
  summary?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

// Google event ids are normally URL-safe already, but this is a Firestore
// document id derived from third-party data — sanitize defensively rather
// than assume, and never write an empty id.
function sanitizeDocId(id: string): string {
  const cleaned = id.replace(/[/\s#[\]*]/g, "_").slice(0, 1500);
  return cleaned || "event";
}

async function markStatus(idToken: string, uid: string, status: "ok" | "expired" | "error"): Promise<void> {
  try {
    await restPatchDoc(idToken, `users/${uid}/settings/prefs`, { googleSyncStatus: status });
  } catch (err) {
    // Best-effort — the sync's own result is still returned to the caller
    // either way, and a failed status write here must not turn into a 500.
    console.error("[calendar/sync] failed to write googleSyncStatus", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = req.headers.get(UID_HEADER);
    const idToken = req.cookies.get("session")?.value;
    if (!uid || !idToken) {
      return NextResponse.json({ status: "error" }, { status: 401 });
    }

    const prefs = await restGetDoc(idToken, `users/${uid}/settings/prefs`);
    const encrypted = prefs?.googleRefreshTokenEncrypted as string | undefined;
    if (!encrypted) {
      return NextResponse.json({ status: "not_connected" }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      // Config was removed after a token was already stored — can't refresh
      // without it. Leave calendarCache and googleSyncStatus untouched;
      // this isn't a token problem, it's a deploy-config problem.
      console.error("[calendar/sync] GOOGLE_CLIENT_ID/SECRET missing while a refresh token exists");
      return NextResponse.json({ status: "error" });
    }

    let refreshToken: string;
    try {
      refreshToken = decryptToken(encrypted);
    } catch (err) {
      console.error("[calendar/sync] failed to decrypt stored token", err);
      await markStatus(idToken, uid, "error");
      return NextResponse.json({ status: "error" });
    }

    let accessToken: string;
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });
      if (!tokenRes.ok) {
        const bodyText = await tokenRes.text();
        console.error("[calendar/sync] token refresh failed", tokenRes.status, bodyText);
        let invalidGrant = false;
        try {
          invalidGrant = (JSON.parse(bodyText) as { error?: string }).error === "invalid_grant";
        } catch {
          // Non-JSON body — fall through with invalidGrant left false.
        }
        await markStatus(idToken, uid, invalidGrant ? "expired" : "error");
        return NextResponse.json({ status: invalidGrant ? "expired" : "error" });
      }
      const body = (await tokenRes.json()) as { access_token?: string };
      if (!body.access_token) {
        await markStatus(idToken, uid, "error");
        return NextResponse.json({ status: "error" });
      }
      accessToken = body.access_token;
    } catch (err) {
      console.error("[calendar/sync] token refresh threw", err);
      await markStatus(idToken, uid, "error");
      return NextResponse.json({ status: "error" });
    }

    const now = new Date();
    const windowEnd = new Date(now.getTime() + SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const eventsUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    eventsUrl.searchParams.set("timeMin", now.toISOString());
    eventsUrl.searchParams.set("timeMax", windowEnd.toISOString());
    eventsUrl.searchParams.set("singleEvents", "true");
    eventsUrl.searchParams.set("orderBy", "startTime");

    let events: GoogleEvent[];
    try {
      const eventsRes = await fetch(eventsUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!eventsRes.ok) {
        console.error("[calendar/sync] events fetch failed", eventsRes.status, await eventsRes.text());
        // docs/04-tdd.md's error table: "Keep the last calendarCache, show
        // its age. No aggressive retry" — calendarCache is deliberately not
        // touched on this path.
        await markStatus(idToken, uid, "error");
        return NextResponse.json({ status: "error" });
      }
      const body = (await eventsRes.json()) as { items?: GoogleEvent[] };
      events = body.items ?? [];
    } catch (err) {
      console.error("[calendar/sync] events fetch threw", err);
      await markStatus(idToken, uid, "error");
      return NextResponse.json({ status: "error" });
    }

    // Scope decision: skip all-day events (date-only start/end, no
    // dateTime) — v1's minutes-past-midnight model (core/time.ts) has no
    // clean single-block representation for an event with no specific time,
    // and neither docs/02-app-flow.md nor docs/03-backend-schema.md specify
    // one. Revisit if v2 adds an all-day lane.
    const timed = events.filter((e) => e.start?.dateTime && e.end?.dateTime);

    const fetchedAt = Date.now();
    const cacheCol = `users/${uid}/calendarCache`;

    let existingNames: string[];
    try {
      existingNames = await restListDocNames(idToken, cacheCol);
    } catch (err) {
      console.error("[calendar/sync] failed to list existing calendarCache", err);
      await markStatus(idToken, uid, "error");
      return NextResponse.json({ status: "error" });
    }

    const writes: BatchWrite[] = existingNames.map((name) => ({ type: "delete", name }));
    for (const e of timed) {
      writes.push({
        type: "update",
        path: `${cacheCol}/${sanitizeDocId(e.id)}`,
        fields: {
          gcalId: e.id,
          startsAt: Date.parse(e.start!.dateTime!),
          endsAt: Date.parse(e.end!.dateTime!),
          title: e.summary || "(untitled event)",
          fetchedAt,
        },
      });
    }

    try {
      await restBatchWrite(idToken, writes);
      await restPatchDoc(idToken, `users/${uid}/settings/prefs`, {
        googleLastSyncedAt: fetchedAt,
        googleSyncStatus: "ok",
      });
    } catch (err) {
      console.error("[calendar/sync] failed to write calendarCache", err);
      // The wholesale-replace batch may have partially applied — status
      // still flips to "error" so the UI shows a stale-cache warning rather
      // than a false "ok" over data that might be inconsistent.
      await markStatus(idToken, uid, "error");
      return NextResponse.json({ status: "error" });
    }

    return NextResponse.json({ status: "ok", count: timed.length });
  } catch (err) {
    console.error("[calendar/sync] unhandled error", err);
    return NextResponse.json({ status: "error" });
  }
}

// Completes Slice 6's Google Calendar OAuth flow (see ../connect/route.ts).
// Every exit path is a redirect to /settings with a query param the S7 panel
// (a second agent's build) reads to show the right state — this route never
// throws to the browser, matching CLAUDE.md's "degrade to a working board,
// never a blocked one."

import { NextRequest, NextResponse } from "next/server";
import { UID_HEADER } from "@/sessionHeader";
import { verifyState } from "../_oauthState";
import { encryptToken } from "../_tokenCrypto";
import { restPatchDoc } from "../_firestoreRest";

export const runtime = "nodejs";

function toSettings(origin: string, query: string): NextResponse {
  return NextResponse.redirect(new URL(`/settings?${query}`, origin));
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const params = req.nextUrl.searchParams;

  // The user denied consent on Google's screen — not a failure, a choice.
  if (params.get("error")) {
    return toSettings(origin, "calendarConnected=cancelled");
  }

  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || !verifyState(state)) {
    return toSettings(origin, "calendarError=invalid_state");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return toSettings(origin, "calendarError=not_configured");
  }

  // Must exactly match connect/route.ts's redirect_uri — Google rejects the
  // exchange otherwise.
  const redirectUri = new URL("/api/calendar/callback", origin).toString();

  let refreshToken: string;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) {
      console.error("[calendar/callback] token exchange failed", tokenRes.status, await tokenRes.text());
      return toSettings(origin, "calendarError=exchange_failed");
    }
    const body = (await tokenRes.json()) as { refresh_token?: string };
    if (!body.refresh_token) {
      // Most commonly: the user had already granted this scope before and
      // Google silently omitted a fresh refresh_token. connect/route.ts's
      // prompt=consent is exactly what's supposed to prevent this, but the
      // failure is still surfaced rather than silently proceeding with
      // nothing to store.
      console.error("[calendar/callback] token exchange returned no refresh_token");
      return toSettings(origin, "calendarError=exchange_failed");
    }
    refreshToken = body.refresh_token;
  } catch (err) {
    console.error("[calendar/callback] token exchange threw", err);
    return toSettings(origin, "calendarError=exchange_failed");
  }

  // proxy.ts verifies the session cookie and sets this header before this
  // handler ever runs, and the matcher covers /api/* — so this should be
  // unreachable, but it's read defensively rather than assumed.
  const uid = req.headers.get(UID_HEADER);
  const idToken = req.cookies.get("session")?.value;
  if (!uid || !idToken) {
    console.error("[calendar/callback] missing uid or session cookie past proxy.ts");
    return toSettings(origin, "calendarError=exchange_failed");
  }

  try {
    const encrypted = encryptToken(refreshToken);
    await restPatchDoc(idToken, `users/${uid}/settings/prefs`, {
      googleRefreshTokenEncrypted: encrypted,
      googleConnectedAt: Date.now(),
      googleSyncStatus: "ok",
    });
  } catch (err) {
    console.error("[calendar/callback] failed to persist token", err);
    return toSettings(origin, "calendarError=exchange_failed");
  }

  return toSettings(origin, "calendarConnected=1");
}

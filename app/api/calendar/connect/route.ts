// Starts Slice 6's Google Calendar OAuth flow (docs/04-tdd.md §Calendar
// integration, docs/02-app-flow.md S7 "Connect Google Calendar"). Firebase
// Auth's own Google sign-in provider never returns a refresh token, so
// `calendar.readonly` needs its own, separate consent step — this route
// only builds the redirect to Google's consent screen; the code exchange
// happens in ../callback/route.ts.
//
// GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET don't exist in this project's
// .env.local yet (no Google Cloud OAuth client has been created). Rather
// than construct a broken authorization URL, that's a first-class case:
// redirect straight to a settings error state, same as Slice 7 degraded
// correctly with no Gemini key.
//
// No rate limiting here (contrast app/api/ai/guard.ts) — this route never
// spends a metered third-party call itself, it only redirects, and it's
// already behind proxy.ts's auth wall (an unauthed GET never reaches this
// handler at all).

import { NextRequest, NextResponse } from "next/server";
import { createState } from "../_oauthState";

export const runtime = "nodejs";

const NOT_CONFIGURED = "/settings?calendarError=not_configured";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL(NOT_CONFIGURED, origin));
  }

  let state: string;
  try {
    // Also depends on TOKEN_ENCRYPTION_KEY (see _oauthState.ts) — missing
    // that is just as much a "not configured" state as missing OAuth
    // credentials, since we can't safely start the flow without it.
    state = createState();
  } catch {
    return NextResponse.redirect(new URL(NOT_CONFIGURED, origin));
  }

  const redirectUri = new URL("/api/calendar/callback", origin).toString();
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.readonly");
  // access_type=offline + prompt=consent together guarantee a refresh_token
  // comes back even on a re-consent (Google otherwise omits it on repeat
  // authorizations) — both are required, not belt-and-suspenders.
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl);
}

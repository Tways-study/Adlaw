// A presence check, not a network probe (see the plan's "A live key check
// is a status probe" decision) — Settings needs to show whether Gemini is
// actually available server-side without spending a request against the
// shared free-tier quota just to render a settings screen. Calls
// getProviderInfo() with no override, so this always reports the env-var
// default resolution, never a particular user's aiProvider preference.

import { NextResponse } from "next/server";
import { getProviderInfo } from "@/ai";
import { guard } from "../guard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = guard(req);
  if (gate instanceof NextResponse) return gate;

  const { name, model } = getProviderInfo();
  return NextResponse.json({ available: name === "gemini", model });
}

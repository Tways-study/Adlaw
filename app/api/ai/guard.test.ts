// Coverage for the abuse boundary in front of app/api/ai/*. This logic is
// only reachable in production behind a real Firebase session cookie, so it
// is exercised here directly rather than over HTTP — the alternative is no
// coverage at all for the one piece of code standing between open signup and
// a shared metered API key.

import { beforeEach, describe, expect, test } from "vitest";
import { NextResponse } from "next/server";
import { guard, resetRateLimit, MAX_PER_UID, MAX_GLOBAL } from "@/app/api/ai/guard";
import { UID_HEADER } from "@/sessionHeader";

function req(uid?: string): Request {
  const headers = new Headers();
  if (uid) headers.set(UID_HEADER, uid);
  return new Request("https://example.test/api/ai/parse", { method: "POST", headers });
}

function status(result: NextResponse | string): number | "allowed" {
  return result instanceof NextResponse ? result.status : "allowed";
}

beforeEach(() => resetRateLimit());

describe("guard — identity", () => {
  test("rejects a request with no uid header", () => {
    expect(status(guard(req()))).toBe(401);
  });

  test("allows a request carrying a uid and returns it", () => {
    expect(guard(req("alice"))).toBe("alice");
  });
});

describe("guard — per-uid rate limit", () => {
  test("allows exactly MAX_PER_UID requests, then 429s", () => {
    for (let i = 0; i < MAX_PER_UID; i++) {
      expect(status(guard(req("alice")))).toBe("allowed");
    }
    expect(status(guard(req("alice")))).toBe(429);
  });

  test("a 429 carries retry-after so a client can back off", () => {
    for (let i = 0; i < MAX_PER_UID; i++) guard(req("alice"));
    const res = guard(req("alice"));
    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).headers.get("retry-after")).toBe("60");
  });

  // The limit has to be per-account, not global-only, or one heavy user
  // silently denies service to everyone else.
  test("one uid exhausting its quota does not block another uid", () => {
    for (let i = 0; i <= MAX_PER_UID; i++) guard(req("alice"));
    expect(status(guard(req("alice")))).toBe(429);
    expect(status(guard(req("bob")))).toBe("allowed");
  });
});

describe("guard — global backstop", () => {
  // Per-uid alone cannot see the "many accounts, one attacker" case that
  // open signup makes cheap, which is the whole reason the second limit
  // exists. Spread across enough distinct uids that no per-uid cap trips.
  test("many distinct uids still hit the global ceiling", () => {
    let allowed = 0;
    for (let i = 0; i < MAX_GLOBAL + MAX_PER_UID; i++) {
      const uid = `user-${Math.floor(i / MAX_PER_UID)}`;
      if (status(guard(req(uid))) === "allowed") allowed++;
    }
    expect(allowed).toBe(MAX_GLOBAL);
  });

  // A uid that is already over its own limit must not also spend the shared
  // budget, or one abuser drains the backstop for everyone.
  test("a per-uid rejection does not consume global budget", () => {
    for (let i = 0; i < MAX_PER_UID; i++) guard(req("alice"));
    for (let i = 0; i < 50; i++) expect(status(guard(req("alice")))).toBe(429);
    // bob still has the full global budget minus alice's allowed requests.
    let allowed = 0;
    for (let i = 0; i < MAX_PER_UID; i++) {
      if (status(guard(req("bob"))) === "allowed") allowed++;
    }
    expect(allowed).toBe(MAX_PER_UID);
  });
});

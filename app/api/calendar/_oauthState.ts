// CSRF protection for the Calendar OAuth flow's `state` parameter
// (./connect/route.ts issues it, ./callback/route.ts verifies it). It
// carries no identity on purpose — the callback's identity comes from the
// verified session cookie / x-adlaw-uid header regardless of what `state`
// says (see connect/route.ts's comment) — it exists only to prove the
// callback we're processing corresponds to a /connect redirect this server
// issued recently, standard OAuth CSRF hygiene.
//
// Signed with HMAC-SHA256 over a key derived from TOKEN_ENCRYPTION_KEY via
// HKDF (a labeled hash), not the raw key itself. That's key separation for
// its own sake — this app has one shared secret, not two — but it costs
// nothing and means a future key-rotation-for-one-purpose isn't blocked by
// reuse.

import { createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

// A 10-minute authorization flow is generous for a human clicking through
// Google's consent screen and tight enough that a leaked/logged `state`
// value is useless shortly after.
const FRESHNESS_MS = 10 * 60 * 1000;
const HKDF_INFO = "adlaw-calendar-oauth-state";

function loadStateKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  }
  const master = Buffer.from(raw, "base64");
  return Buffer.from(hkdfSync("sha256", master, Buffer.alloc(0), HKDF_INFO, 32));
}

function sign(payload: string, key: Buffer): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/** A random nonce + timestamp, HMAC-signed, base64url-encoded end to end. */
export function createState(): string {
  const key = loadStateKey();
  const nonce = randomBytes(16).toString("base64url");
  const payload = `${nonce}.${Date.now()}`;
  const sig = sign(payload, key);
  return Buffer.from(`${payload}.${sig}`, "utf8").toString("base64url");
}

/** True iff `state` was produced by createState() within the last FRESHNESS_MS. */
export function verifyState(state: string): boolean {
  try {
    const key = loadStateKey();
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 3) return false;
    const [nonce, tsStr, sig] = parts;
    const expected = sign(`${nonce}.${tsStr}`, key);

    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return false;
    }

    const ts = Number(tsStr);
    if (!Number.isFinite(ts)) return false;
    return Math.abs(Date.now() - ts) <= FRESHNESS_MS;
  } catch {
    return false;
  }
}

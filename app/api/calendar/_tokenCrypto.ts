// Server-only. AES-256-GCM encryption for the Google Calendar refresh token
// at rest in settings/prefs.googleRefreshTokenEncrypted
// (docs/03-backend-schema.md §Calendar OAuth). Node's built-in node:crypto —
// no new dependency, matching this project's "deps kept minimal" pattern
// already used for ai/gemini.ts (plain fetch against Gemini's REST API
// instead of an SDK).
//
// TOKEN_ENCRYPTION_KEY is a base64-encoded 32-byte (256-bit) key. Generate
// one locally with:
//
//   openssl rand -base64 32
//
// and set it as TOKEN_ENCRYPTION_KEY in Vercel's server environment (never
// NEXT_PUBLIC_ — see docs/04-tdd.md's Environment table). It does not exist
// in this project's .env.local yet; every function below throws a clear,
// catchable error rather than silently producing bad output when it's
// missing or malformed, so callers (app/api/calendar/callback and
// .../sync) can degrade instead of crashing the route.
//
// Stored wire format: base64(iv (12 bytes) || authTag (16 bytes) || ciphertext).
// A fresh random IV per call is what makes it safe to reuse one key across
// every user's token; the authTag is GCM's built-in integrity check, so a
// tampered or corrupted stored value throws on decrypt instead of quietly
// returning garbage.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

function loadKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LEN) {
    throw new Error(`TOKEN_ENCRYPTION_KEY must decode to ${KEY_LEN} bytes (got ${key.length})`);
  }
  return key;
}

export function encryptToken(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptToken(encrypted: string): string {
  const key = loadKey();
  const raw = Buffer.from(encrypted, "base64");
  if (raw.length < IV_LEN + TAG_LEN) {
    throw new Error("encrypted token is malformed (too short)");
  }
  const iv = raw.subarray(0, IV_LEN);
  const authTag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = raw.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

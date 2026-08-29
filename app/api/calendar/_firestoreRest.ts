// Server-only Firestore REST client for app/api/calendar/* Route Handlers —
// never imported by ui/ or firebase/, which talk to Firestore through the
// client SDK with the browser's own auth session.
//
// Why this exists: docs/04-tdd.md says the Calendar OAuth callback "writes
// [the encrypted refresh token] to settings/prefs via the Firestore client
// SDK", and sync must read it, then replace calendarCache wholesale, from
// server code — but there is no Firebase Admin SDK and no service account
// anywhere in this project (confirmed across Slices 7-8), so a Route
// Handler has no `firebase-admin` path to Firestore. The resolution:
// Firestore's REST API accepts a Firebase ID token as a Bearer credential
// and evaluates firestore.rules exactly as if the client SDK had made the
// call — this is the same protocol the client SDK itself speaks under the
// hood (over gRPC/WebSocket rather than plain HTTP), not a bypass of the
// rules. Every call here is therefore still subject to `isOwner(uid)` and
// this slice's calendarCache/settings field validation in firestore.rules.

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

function baseUrl(): string {
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
}

// ---- Wire format ----
//
// Firestore's REST representation of a field value. Every number this app
// writes through this module is an epoch-ms timestamp or a plain integer —
// never a float — so encodeFields always emits integerValue for `number`.
// integerValue's own *value* is a string (e.g. {"integerValue": "123"}) even
// though the type is "integer" — that's required to preserve int64
// precision through JSON's float64, which would otherwise silently corrupt
// a large epoch-ms timestamp.
type WireValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null };

/**
 * Wraps a plain object's top-level values in Firestore REST's wire format.
 * Throws on any value type this app never actually stores (arrays, nested
 * objects) — every field this module writes is a flat scalar, so a thrown
 * error here means a caller passed something wrong, not a format this
 * function silently mishandles.
 */
export function encodeFields(obj: Record<string, unknown>): Record<string, WireValue> {
  const out: Record<string, WireValue> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      out[key] = { nullValue: null };
    } else if (typeof value === "string") {
      out[key] = { stringValue: value };
    } else if (typeof value === "boolean") {
      out[key] = { booleanValue: value };
    } else if (typeof value === "number") {
      out[key] = { integerValue: String(Math.trunc(value)) };
    } else {
      throw new Error(`encodeFields: unsupported value type for key "${key}": ${typeof value}`);
    }
  }
  return out;
}

/**
 * Reverses encodeFields — unwraps a Firestore REST document's `fields`
 * object (or a single wire-format value map) back into a plain JS object.
 * Reads whichever `*Value` key is present per field; `integerValue` parses
 * back through `Number(...)`, which is safe for every value this app
 * actually stores (epoch-ms timestamps are far under
 * Number.MAX_SAFE_INTEGER).
 */
export function decodeFields(wireFields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, wire] of Object.entries(wireFields)) {
    const w = wire as Record<string, unknown>;
    if ("stringValue" in w) out[key] = w.stringValue;
    else if ("integerValue" in w) out[key] = Number(w.integerValue);
    else if ("doubleValue" in w) out[key] = w.doubleValue;
    else if ("booleanValue" in w) out[key] = w.booleanValue;
    else if ("nullValue" in w) out[key] = null;
    else throw new Error(`decodeFields: unrecognized wire value for key "${key}": ${JSON.stringify(wire)}`);
  }
  return out;
}

async function firestoreFetch(url: string, idToken: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${idToken}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

/**
 * GET a single document. Returns `null` on 404 (the document doesn't
 * exist — a legitimate, common case: a brand-new user has no settings/prefs
 * doc yet), throws on any other non-2xx.
 */
export async function restGetDoc(idToken: string, path: string): Promise<Record<string, unknown> | null> {
  const res = await firestoreFetch(`${baseUrl()}/${path}`, idToken);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`restGetDoc(${path}) failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { fields?: Record<string, unknown> };
  return body.fields ? decodeFields(body.fields) : {};
}

/**
 * PATCH (merge) a subset of a document's top-level fields — the REST
 * equivalent of the client SDK's `setDoc(ref, data, { merge: true })`. One
 * `updateMask.fieldPaths` query param per top-level key in `fields` is what
 * makes this a merge instead of a full-document replace; Firestore also
 * creates the document if it doesn't exist yet, same as the client SDK's
 * merge write.
 */
export async function restPatchDoc(
  idToken: string,
  path: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const mask = Object.keys(fields)
    .map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
    .join("&");
  const url = `${baseUrl()}/${path}${mask ? `?${mask}` : ""}`;
  const res = await firestoreFetch(url, idToken, {
    method: "PATCH",
    body: JSON.stringify({ fields: encodeFields(fields) }),
  });
  if (!res.ok) {
    throw new Error(`restPatchDoc(${path}) failed: ${res.status} ${await res.text()}`);
  }
}

/**
 * Lists the full resource names (`projects/…/documents/…`) of every
 * document directly inside a collection. Empty array if the collection
 * doesn't exist or the response carries no `documents` key — Firestore
 * collections are implicit, so an empty/never-written collection is a
 * normal 200 with no `documents`, not a 404.
 */
export async function restListDocNames(idToken: string, collectionPath: string): Promise<string[]> {
  const res = await firestoreFetch(`${baseUrl()}/${collectionPath}`, idToken);
  if (!res.ok) {
    throw new Error(`restListDocNames(${collectionPath}) failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { documents?: Array<{ name: string }> };
  return body.documents?.map((d) => d.name) ?? [];
}

export type BatchWrite =
  | { type: "delete"; name: string }
  | { type: "update"; path: string; fields: Record<string, unknown> };

/**
 * A single `documents:batchWrite` call — each write in the array succeeds
 * or fails independently (this is not a transaction), which is exactly the
 * "replace calendarCache wholesale" shape the sync route needs: a delete for
 * every existing cached event plus an update for every freshly-fetched one,
 * in one round trip. No-op if `writes` is empty, since Firestore rejects an
 * empty `writes` array outright.
 */
export async function restBatchWrite(idToken: string, writes: BatchWrite[]): Promise<void> {
  if (writes.length === 0) return;
  const body = {
    writes: writes.map((w) =>
      w.type === "delete"
        ? { delete: w.name }
        : {
            update: {
              name: `projects/${PROJECT_ID}/databases/(default)/documents/${w.path}`,
              fields: encodeFields(w.fields),
            },
          },
    ),
  };
  const res = await firestoreFetch(`${baseUrl().replace("/documents", "")}/documents:batchWrite`, idToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`restBatchWrite failed: ${res.status} ${await res.text()}`);
  }
}

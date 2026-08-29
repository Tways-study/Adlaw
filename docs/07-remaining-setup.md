# Remaining setup

Everything code-shaped in `04-tdd.md`'s build order (Slices 1–9) is built and
on `main`. What's left is configuration and external accounts — things only
you can do, since they need access this session doesn't have (a Vercel
account, a Google Cloud project, an API key). Ordered by how much they block.

## 1. Deploy the live Firestore rules (do this first)

**The rules deployed to the live project are stale.** `firestore.rules` in
this repo has real field validation for `scheduleBlocks`, `calendarCache`,
`aiLog`, and `settings` (built across Slices 4, 6, 7, 8) — every one of
those already has dedicated tests in `firestore.rules.test.ts`, and
`npm run test:rules` passes against them. But nothing has ever pushed that
file to the live project. What's actually enforcing access right now is the
original Slice-2-era stub:

```
// what's live today, for these four collections:
match /scheduleBlocks/{blockId} { allow read, write: if isOwner(uid); }
match /calendarCache/{eventId} { allow read, write: if isOwner(uid); }
match /aiLog/{logId}           { allow read, write: if isOwner(uid); }
match /settings/{docId}        { allow read, write: if isOwner(uid); }
```

Ownership is still enforced (no cross-user leakage), but none of the field
shape/type checks this repo's tests actually verify are live. Deploy the
current file:

```
firebase deploy --only firestore:rules
```

(Firestore composite indexes are already deployed and match
`firestore.indexes.json` — that part's fine, no action needed there.)

## 2. Deploy the app (Vercel)

No `vercel.json` needed — Vercel auto-detects Next.js. At
[vercel.com/new](https://vercel.com/new), import the `Tways-study/Adlaw`
GitHub repo, then set these in **Settings → Environment Variables**:

**Required** — without these the app throws `auth/invalid-api-key` on every
route (same failure we hit and fixed locally earlier):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

(Copy these straight from your local `.env.local` — same Firebase project,
same values.)

Then add the deployed domain (`your-app.vercel.app`, plus any custom domain)
to **Firebase console → Authentication → Settings → Authorized domains**, or
sign-in fails there even with correct keys.

## 3. Gemini API key (optional — AI parsing degrades to heuristic without it)

Not set locally or in any deploy target yet. Without it, Slice 7's AI layer
silently falls back to the heuristic parser everywhere — nothing breaks, but
parses are rules-based rather than model-based.

- Get a free-tier key at [aistudio.google.com](https://aistudio.google.com).
- Set `GEMINI_API_KEY` (server environment only — **never**
  `NEXT_PUBLIC_`, per `04-tdd.md`'s environment table; `app/api/ai/*` Route
  Handlers are the only caller).
- `AI_PROVIDER` / `AI_MODEL` are optional overrides on top of that; leave
  unset to use the built-in defaults.

## 4. Google Calendar OAuth (optional — Settings shows "not configured" without it)

Slice 6 (OAuth, sync, the connect panel) is fully built and was
browser-verified against the `not_configured` degrade path, but no real
Google OAuth client exists yet. To make Calendar actually connectable:

1. In [Google Cloud Console](https://console.cloud.google.com), create an
   OAuth 2.0 Client ID (type: Web application) with the
   `calendar.readonly` scope.
2. Add an authorized redirect URI:
   `https://<your-domain>/api/calendar/callback` (and
   `http://localhost:3000/api/calendar/callback` if you want to test this
   locally too).
3. Set three env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
   `TOKEN_ENCRYPTION_KEY` (a random 32-byte value, e.g.
   `openssl rand -base64 32` — this encrypts the stored refresh token at
   rest; see `app/api/calendar/_tokenCrypto.ts`).

## 5. Known, documented, not yet fixed: a chip contrast bug

`DESIGN.md` already flags this explicitly (§Color → Rules) — noting it here
so it doesn't get lost:

> `--primary` on `--primary-soft` is 4.05:1 in light theme, below the 4.5:1
> AA floor. `ui/capture/CaptureBar.module.css` still ships the failing
> pairing... the board should adopt `--primary-ink` for its chips.

Still true: `CaptureBar.module.css`'s `.chip` uses `color: var(--primary)`
on `var(--primary-soft)`. One-line fix (swap to `--primary-ink`), just never
landed.

## 6. `CLAUDE.md`'s "Repository state" section is stale

It currently opens with "Slices 1–5 built... **No Calendar and no AI yet**"
— that was true when it was written, but Slices 6–9 have since landed
(Calendar, AI, config surfaces, offline queue). Worth a rewrite so the next
session (agent or human) doesn't start from an inaccurate picture of what's
built. Not urgent — everything it says about architecture rules, the module
map, and the amendments is still accurate — just the opening status
paragraph needs updating.

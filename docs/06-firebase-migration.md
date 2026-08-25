> **Project:** Adlaw · **Doc:** Firebase Migration Plan · **Version:** 1.0 · **Date:** 2026-08-23
> **Status:** Approved — not yet executed
> **Upstream:** `00-intake.md`, `00-stack-decision.md`, `03-backend-schema.md`, `04-tdd.md`

# Migrating the backend from Convex to Firebase

## Context

The author has directed a move off Convex to **Firebase** (Firestore for data,
Firebase Auth for identity), adding **Google sign-in**. This is the fourth
data-layer decision in the project's history (Convex → Postgres → Convex →
Firebase) and, like the previous three, it gets recorded as a dated amendment
rather than allowed to drift — five docs currently assert Convex as settled
fact.

Four decisions were confirmed before planning:

| Decision | Choice | Consequence |
|---|---|---|
| Firebase plan | **Spark (no billing)** | No Firebase Cloud Functions. Invariants move to security rules + client transactions |
| Route gating | **ID-token cookie + JWT verify in `proxy.ts`** | Keeps `proxy.ts` as the sole redirect authority (CLAUDE.md). Adds `jose` |
| Sign-in methods | **Google + email/password** | Both paths; existing forms stay, Google button added |
| Invite gate | **Dropped — open signup** | Reverses the gate added in `00-intake.md`'s Amendment 3 |

### Three tradeoffs to state honestly, not paper over

1. **The one-`now`-task invariant stops being server-enforced.** Today
   `convex/tasks.ts`'s `move` guarantees it inside a mutation. Firestore rules
   cannot express a cross-document constraint, so it becomes a client-side
   `runTransaction` — atomic and correct for a well-behaved client, but not
   database-enforced. Blast radius is one user's own board.
2. **Dropping the invite gate reopens the free-tier quota exposure** that gate
   was built for (Gemini, Calendar, and now Firestore quotas). Deliberate and
   the author's call; recorded as such in the amendment.
3. **Ownership enforcement gets *stronger*.** Today it is `doc.userId ===
   userId` checks in handler code that a future function could forget. Under
   Firestore it is structural — data lives in `users/{uid}/…` subcollections
   and the rule is `request.auth.uid == uid`. No path bypasses it.

### Slices 6–7 are not blocked, despite Spark

Firebase Cloud Functions are out, but the app deploys to **Vercel**, whose
Route Handlers are free on the hobby tier. That is the documented path for the
two things that genuinely need a server:

- **Slice 6 (Calendar).** Firebase Auth's Google provider returns a ~1h OAuth
  access token but **no refresh token**, so `settings.googleRefreshTokenEncrypted`
  as designed in `03-backend-schema.md` is unreachable via Firebase alone. The
  OAuth code exchange moves to a Vercel Route Handler.
- **Slice 7 (AI).** Keeps the Gemini API key off the client.

Flagged now rather than discovered mid-slice.

### Data migration

**None needed.** The local Convex `tasks` and `courses` tables are both empty
(verified); the only rows are throwaway dev auth accounts.

## Architecture

### Data model — subcollections, not top-level + `userId`

```
users/{uid}                     email, displayName, createdAt
  tasks/{taskId}                (same fields as convex/schema.ts, minus userId)
  courses/{courseId}
  scheduleBlocks/{blockId}      (Slice 4)
  calendarCache/{eventId}       (Slice 6)
  aiLog/{logId}                 (Slice 7)
  settings/prefs                single fixed-ID doc
```

Subcollections make ownership structural rather than a `where('userId','==')`
clause every query must remember. `userId` fields disappear entirely — the path
*is* the ownership. Composite indexes for `tasks` (`status ASC, laneOrder ASC`
and `status ASC, completedAt DESC`) go in `firestore.indexes.json`.

### Enforcement — `firestore.rules`

Rules become the schema-validation layer that `convex/tasks.ts`'s `v.object(…)`
validators were: `request.auth.uid == uid` for every path, plus field checks
(`estimateMin > 0`, `status` in the allowed set, `completedAt` present iff
`status == 'done'`, `rawText` immutable after create). The one-`now` rule is the
sole invariant that cannot be expressed here — see tradeoff 1.

### New module layout

```
firebase/
  client.ts     app/auth/firestore init from NEXT_PUBLIC_FIREBASE_* env
  auth.ts       signInWithGoogle / signInWithEmail / signUpWithEmail /
                signOut, plus the onIdTokenChanged → cookie sync
  tasks.ts      typed CRUD; move() is the runTransaction enforcing one-'now'
  hooks.ts      useTasksByStatus / useDoneToday / useCourses —
                onSnapshot wrappers returning `T[] | undefined`
core/
  types.ts      NEW. Task, Course, TaskStatus, ParseState — plain data
  order.ts      NEW. nextLaneOrder / resolveDropLaneOrder, lifted verbatim
                out of convex/tasks.ts
```

Two deliberate improvements the migration enables, both serving CLAUDE.md's
stated `core/` philosophy:

- **`core/types.ts`** replaces `Doc<"tasks">` / `Id<"tasks">` from
  `convex/_generated/dataModel`, which are imported by eight `ui/` files
  (`ui/drag/types.ts`, `dropDetection.ts`, `useDraggableCard.ts`,
  `DragContext.tsx`, `DeleteUndoContext.tsx`, `TaskCard.tsx`,
  `EverythingRail.tsx`, `DoneLane.tsx`). After this, `ui/` depends on `core/`
  rather than a generated backend artifact — a fifth migration would not touch
  them at all.
- **`core/order.ts`** frees the `laneOrder` midpoint math from the mutation it
  is currently trapped in, making it unit-testable with no backend and no
  emulator.

`hooks.ts` returning `T[] | undefined` matches the shape components already
consume (`tasks === undefined` = loading), so the existing skeleton-loading
states carry over unchanged.

### Auth + routing

- `app/ConvexClientProvider.tsx` → `app/FirebaseProvider.tsx`: initializes
  Firebase, runs the `onIdTokenChanged` cookie sync, exposes `useAuth()`
  (`{ user, loading }`). `app/layout.tsx` drops both Convex providers.
- **Cookie sync:** on `onIdTokenChanged`, write the ID token to a
  `path=/; samesite=lax; max-age=3600` cookie (`secure` in production); clear it
  on sign-out. The SDK auto-refreshes hourly and refires, keeping it fresh.
- **`proxy.ts`:** replace `convexAuthNextjsMiddleware` with a plain
  `export default async function`, verifying the cookie with `jose`
  (Edge-compatible, no Admin SDK, no service-account secret):

  ```ts
  const JWKS = createRemoteJWKSet(new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
  await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  ```

  Real cryptographic verification, not a cookie-presence check. The existing
  three-rule structure (authed-first, then public-route check, then fall
  through) and the `/icon` / `/apple-icon` public entries are preserved verbatim.
- **Edge case to handle deliberately:** if the cookie expires while no tab is
  open, `proxy.ts` bounces to `/login` even though the SDK still holds a valid
  refresh token. `/login` therefore checks `onAuthStateChanged` on mount and, if
  a user resolves, refreshes the cookie and redirects to `/board` rather than
  showing a form to someone already signed in.

### UI changes

- `app/(auth)/login/page.tsx` and `signup/page.tsx`: add a "Continue with
  Google" button above the existing form (divider between). **Remove the invite
  code field** and its error branch from signup. Keep all existing motion and
  state work (`.submitLabel` crossfade, `aria-invalid` rings, `.content`
  entrance) — only the auth calls and one field change.
- `ui/board/BoardHeader.tsx`: `useAuthActions().signOut` → `firebase/auth`'s
  `signOut`; the explicit `router.replace("/")` stays.
- `ui/capture/CaptureBar.tsx`, `DeleteUndoContext.tsx`, `useDraggableCard.ts`:
  `useMutation(api.tasks.X)` → direct imports from `firebase/tasks`.
- Lane components: `useQuery(api.tasks.listByStatus, …)` → `useTasksByStatus(…)`.
  Loading/empty/populated branching is untouched.

### Folded in: the `DragProvider` bug

`DragProvider` is defined in `ui/drag/DragContext.tsx` but **never rendered
anywhere** — `app/board/page.tsx` wraps only in `DeleteUndoProvider`. That is
why `/board` currently 500s with `useDragContext must be used within
DragProvider`. It is a one-line fix in a file this migration already rewrites;
doing it here is what makes `/board` verifiable at the end.

## Files

**Delete:** `convex/` (all of it, including `_generated/`),
`app/ConvexClientProvider.tsx`, `scripts/seed-admin.mjs`.

**Add:** `firebase/{client,auth,tasks,hooks}.ts`, `core/{types,order}.ts`,
`app/FirebaseProvider.tsx`, `firestore.rules`, `firestore.indexes.json`,
`firebase.json`, `core/order.test.ts`, `firestore.rules.test.ts`.

**Rewrite:** `proxy.ts`, `app/layout.tsx`, `app/board/page.tsx`, both
`app/(auth)/*/page.tsx`, the four `ui/board/` data components,
`ui/capture/CaptureBar.tsx`, `ui/drag/*`.

**Dependencies:** remove `convex`, `@convex-dev/auth`, `@auth/core`,
`convex-test`; add `firebase@^12.18`, `jose@^6.2`; dev-add
`@firebase/rules-unit-testing`.

## Testing

`core/heuristic.test.ts` and `ui/landing/copy.test.ts` are untouched — both
pure, the `core/` boundary holding exactly as CLAUDE.md predicted. Replacing
`convex/tasks.test.ts`'s 9 tests:

- **`core/order.test.ts`** — the laneOrder cases (append, prepend,
  insert-between, stale neighbor) as pure unit tests, no infrastructure.
- **`firestore.rules.test.ts`** — cross-user isolation (user A cannot read or
  write user B's tasks) and field validation, via `@firebase/rules-unit-testing`
  against the emulator.

The emulator needs Java and a running process, so it stays off the fast loop:
`npm test` remains pure-Node and fast; `npm run test:rules` runs the emulator
suite deliberately. Documented in CLAUDE.md.

## Docs to update

Same convention the multi-user pivot followed — every doc asserting the old
thing is corrected in this change, not later:

- **`docs/00-intake.md`** — Amendment 4 (2026-08-23): Firebase, Google sign-in,
  Spark-plan consequences, and the invite-gate reversal with its quota tradeoff
  stated.
- **`docs/00-stack-decision.md`** — v4.0, including why Spark over Blaze and
  Vercel Route Handlers as the server escape hatch for Slices 6–7.
- **`docs/03-backend-schema.md`** — Firestore collections, rules as the
  enforcement layer, the one-`now` caveat, and the now-unreachable
  `googleRefreshTokenEncrypted` design.
- **`docs/04-tdd.md`** — module map, data flow, the split test strategy.
- **`CLAUDE.md`** — repository state, stack, module map, commands, and the
  architecture-rules section (the "enforced in the mutation layer" line for
  one-`now` is now wrong).
- **`README.md`** — getting started (Firebase env vars replace `npx convex
  dev`), stack line.
- **`docs/01-prd.md`** — two incidental mentions.

## Verification

- `npx tsc --noEmit`, `npm run lint`, `npm test` (pure suite), then
  `npm run test:rules` against the emulator.
- Firebase console setup: enable Google + Email/Password providers, add
  `localhost` to authorized domains, deploy rules and indexes.
- Browser, both themes: sign up with Google (new account → lands on an empty
  `/board`); sign up with email/password; sign in with each; confirm a second
  account sees none of the first's tasks. Create a task, drag it between lanes,
  promote two different tasks to `now` in sequence and confirm the first demotes
  (the transaction invariant), complete, delete + undo.
- `/board` must render at all — the `DragProvider` fix is what makes every check
  above possible.
- Signed out, confirm `proxy.ts` still redirects `/board` → `/login` and leaves
  `/`, `/login`, `/signup`, `/icon`, `/apple-icon` reachable (curl, as when this
  was last verified).
- Delete the ID-token cookie by hand with the tab open, reload, and confirm
  `/login` bounces straight back to `/board` rather than showing a form to a
  signed-in user (the refresh edge case above).

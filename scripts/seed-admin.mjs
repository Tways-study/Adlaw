// One-off: seed the first Convex Auth account (docs/03-backend-schema.md
// §Auth, docs/00-stack-decision.md). Reads SEED_EMAIL/SEED_PASSWORD/
// SIGNUP_INVITE_CODE from the environment — no credentials are ever
// hardcoded here. As of docs/00-intake.md's Amendment 3, signup is
// invite-gated rather than one-time-only: this script goes through the same
// `/signup` flow anyone else would, and SIGNUP_INVITE_CODE here must match
// the value set on the Convex deployment (`npx convex env set
// SIGNUP_INVITE_CODE ...`). Re-running it with a different email is a
// legitimate way to create another account, not an error.
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const email = process.env.SEED_EMAIL;
const password = process.env.SEED_PASSWORD;
const inviteCode = process.env.SIGNUP_INVITE_CODE;
const url = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!email || !password || !inviteCode) {
  console.error(
    "Usage: SEED_EMAIL=... SEED_PASSWORD=... SIGNUP_INVITE_CODE=... node scripts/seed-admin.mjs",
  );
  process.exit(1);
}
if (!url) {
  console.error("NEXT_PUBLIC_CONVEX_URL is not set — run this after `npx convex dev` has written .env.local");
  process.exit(1);
}

const client = new ConvexHttpClient(url);

await client.action(api.auth.signIn, {
  provider: "password",
  params: { email, password, inviteCode, flow: "signUp" },
});

console.log(`Seeded ${email}.`);

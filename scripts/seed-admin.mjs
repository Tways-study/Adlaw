// One-off: seed the single Convex Auth account (docs/03-backend-schema.md
// §Auth, docs/00-stack-decision.md). Run once: reads SEED_EMAIL/SEED_PASSWORD
// from the environment — no credentials are ever hardcoded here. After the
// first successful run, convex/auth.ts's createOrUpdateUser guard rejects
// every future signup permanently, so re-running this is a no-op error, not
// a way to add a second account.
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const email = process.env.SEED_EMAIL;
const password = process.env.SEED_PASSWORD;
const url = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!email || !password) {
  console.error("Usage: SEED_EMAIL=... SEED_PASSWORD=... node scripts/seed-admin.mjs");
  process.exit(1);
}
if (!url) {
  console.error("NEXT_PUBLIC_CONVEX_URL is not set — run this after `npx convex dev` has written .env.local");
  process.exit(1);
}

const client = new ConvexHttpClient(url);

await client.action(api.auth.signIn, {
  provider: "password",
  params: { email, password, flow: "signUp" },
});

console.log(`Seeded ${email}. Any future signUp attempt will now be rejected.`);

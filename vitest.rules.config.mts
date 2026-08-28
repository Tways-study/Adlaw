import { defineConfig } from "vitest/config";

// Separate from vitest.config.mts, which excludes firestore.rules.test.ts to
// keep `npm test` pure and emulator-free. A CLI --exclude appends to that
// list rather than replacing it, so the rules suite needs its own config.
export default defineConfig({
  test: {
    include: ["firestore.rules.test.ts"],
    exclude: ["node_modules", ".next"],
    testTimeout: 15000,
  },
});

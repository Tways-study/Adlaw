import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Mirrors tsconfig.json's "@/*" -> "./*" so a test can import a module that
  // uses the alias. Adding this does not make tests any less pure — it is
  // path resolution only, no environment and no DOM (see CLAUDE.md).
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname) },
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next", "firestore.rules.test.ts"],
  },
});

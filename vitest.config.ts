/**
 * Unit tests in two projects, split by whether a test needs a DOM, with
 * coverage held at 100% across both, and the integration tests apart, against
 * the test database.
 *
 * decisions/012-project-init.md
 * decisions/023-database.md
 */

import { existsSync } from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { coverageExclusions, coverageInclude } from "./scripts/coverage-plan.ts";

// Vitest does not read .env; CI sets the variables itself.
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", environment: "node", include: ["tests/unit/**/*.test.ts"] },
      },
      {
        extends: true,
        test: { name: "unit-dom", environment: "jsdom", include: ["tests/unit/**/*.test.tsx"] },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          // The test database, never the development one; the guard refuses anything else.
          env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? "" },
          globalSetup: ["tests/support/integration-guard.ts"],
          // One file at a time, because they share one database.
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      provider: "v8",
      // `json` for scripts/coverage-gaps.ts, `lcov` for SonarCloud.
      reporter: ["text", "json", "lcov"],
      include: coverageInclude,
      exclude: Object.keys(coverageExclusions),
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
});

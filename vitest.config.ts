/**
 * Unit tests in two projects, split by whether a test needs a DOM, with
 * coverage held at 100% across both.
 *
 * decisions/012-project-init.md
 */

import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { coverageExclusions, coverageInclude } from "./scripts/coverage-plan.ts";

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

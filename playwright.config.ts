/**
 * End-to-end tests against a production build, in Chromium at a phone's width
 * and at a desktop's, on the test database with test-only sign-in values.
 *
 * decisions/012-project-init.md
 * decisions/f001-trainer-side.md
 */

import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { integrationDatabaseRefusal } from "./scripts/test-database.ts";

// Playwright does not read .env; CI sets the variables itself.
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}
// The tests seed the database the server under test reads: the test one, never the
// development one. Refused here, before the server or any test starts.
const refusal = integrationDatabaseRefusal(process.env.TEST_DATABASE_URL);
if (refusal !== null) {
  throw new Error(`end-to-end tests refused: ${refusal}`);
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const { PORT, SERVER_ENV, WORKERS } = await import("./tests/e2e/support/environment.ts");

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/support/global-setup.ts",
  forbidOnly: !!process.env.CI,
  // One allowed parent per worker running at once.
  workers: WORKERS,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // `npm run test:e2e` builds first, so this serves the code as it is now.
    command: `next start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: SERVER_ENV,
  },
});

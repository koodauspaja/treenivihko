/**
 * End-to-end tests against a production build, in Chromium at a phone's width
 * and at a desktop's.
 *
 * decisions/012-project-init.md
 */

import { defineConfig, devices } from "@playwright/test";

const port = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // `npm run test:e2e` builds first, so this serves the code as it is now.
    command: `next start --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
  },
});

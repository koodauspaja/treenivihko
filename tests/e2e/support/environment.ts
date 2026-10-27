/**
 * What the server under test and the tests share: test-only sign-in values,
 * nothing that reaches Google, and the test database. Each worker running at
 * once has a parent of its own, so tests in parallel never share state.
 *
 * decisions/f001-trainer-side.md
 * decisions/f002-exercise-library.md
 */

export const PORT = 3100;

/** At most this many workers run at once, each with one of the parents. */
export const WORKERS = 4;

/** The parent of the worker with Playwright's `parallelIndex`. */
export const parentEmail = (parallelIndex: number) => `parent-${parallelIndex}@example.com`;

export const SERVER_ENV = {
  DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
  BETTER_AUTH_SECRET: "end-to-end-test-secret-of-32-characters",
  BETTER_AUTH_URL: `http://localhost:${PORT}`,
  GOOGLE_CLIENT_ID: "end-to-end-test-client-id",
  GOOGLE_CLIENT_SECRET: "end-to-end-test-client-secret",
  AUTH_ALLOWED_EMAILS: Array.from({ length: WORKERS }, (_, index) => parentEmail(index)).join(","),
};

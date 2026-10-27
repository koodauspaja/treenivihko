/**
 * What the server under test and the tests share: test-only sign-in values,
 * nothing that reaches Google, and the test database. Each browser project
 * has a parent of its own, so the two never share state.
 * decisions/f001-trainer-side.md
 */

export const PORT = 3100;

export const PARENTS = { phone: "phone@example.com", desktop: "desktop@example.com" } as const;

export const SERVER_ENV = {
  DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
  BETTER_AUTH_SECRET: "end-to-end-test-secret-of-32-characters",
  BETTER_AUTH_URL: `http://localhost:${PORT}`,
  GOOGLE_CLIENT_ID: "end-to-end-test-client-id",
  GOOGLE_CLIENT_SECRET: "end-to-end-test-client-secret",
  AUTH_ALLOWED_EMAILS: Object.values(PARENTS).join(","),
};

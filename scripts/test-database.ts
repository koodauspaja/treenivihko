/**
 * Which database the integration tests may run against: one whose name ends
 * in `_test`, so they can never empty a database that matters.
 *
 * decisions/023-database.md
 */

/** Why the integration tests refuse this connection string, or `null` when they may run. */
export function integrationDatabaseRefusal(url: string | undefined): string | null {
  if (url === undefined || url.trim() === "") {
    return "TEST_DATABASE_URL is not set: copy .env.example to .env and fill it in";
  }
  let name: string;
  try {
    name = decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  } catch {
    return "TEST_DATABASE_URL is not a connection string";
  }
  if (!name.endsWith("_test")) {
    return `The integration tests run only on a database whose name ends in _test, not "${name || "(none)"}"`;
  }
  return null;
}

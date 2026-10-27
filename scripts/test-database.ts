/**
 * Which database the integration tests may run against: one on this machine
 * whose name ends in `_test`, so they can never change a database that matters.
 *
 * decisions/023-database.md
 */

/** Hosts the integration tests may reach: this machine, which is also CI's service container. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Why the integration tests refuse this connection string, or `null` when they may run. */
export function integrationDatabaseRefusal(url: string | undefined): string | null {
  if (url === undefined || url.trim() === "") {
    return "TEST_DATABASE_URL is not set: copy .env.example to .env and fill it in";
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "TEST_DATABASE_URL is not a connection string";
  }
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    return `The integration tests run only on this machine's Postgres, not on "${parsed.hostname}"`;
  }
  // The driver reads options such as host or db from the query, after this check.
  if (parsed.search !== "") {
    return "TEST_DATABASE_URL may not carry a query string, which could name another host or database";
  }
  let name: string;
  try {
    name = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  } catch {
    return "TEST_DATABASE_URL's database name is not readable";
  }
  if (!name.endsWith("_test")) {
    return `The integration tests run only on a database whose name ends in _test, not "${name || "(none)"}"`;
  }
  return null;
}

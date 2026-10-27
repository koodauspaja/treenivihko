/**
 * The database client, made on first use, with a statement timeout so a stalled
 * query fails rather than holding a request; and a separate client for
 * migrations, which may legitimately run longer.
 *
 * decisions/023-database.md
 * decisions/026-railway.md
 */

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { requireDatabaseUrl } from "./connection-string";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

/** How long one statement may run, lock waits included, before Postgres cancels it. */
export const STATEMENT_TIMEOUT_MS = 10_000;

/** A migration's statements are not cancelled: Postgres reads 0 as no timeout. */
export const MIGRATION_STATEMENT_TIMEOUT_MS = 0;

/**
 * How long a connection may sit idle before it is closed. Open, the driver sends
 * a keepalive every minute, and Railway lets nothing sleep that still sends.
 */
export const IDLE_TIMEOUT_SECONDS = 20;

type Connection = { database: Database; close: () => Promise<void> };

/** The application's pool: the driver's own default. */
export const APPLICATION_CONNECTIONS = 10;

/** One, so the migration lock is taken and released in the same session. */
export const MIGRATION_CONNECTIONS = 1;

/** The driver's options for a client of `connections` whose statements time out after `statementTimeoutMs`. */
export function clientOptions(statementTimeoutMs: number, connections: number) {
  return {
    max: connections,
    idle_timeout: IDLE_TIMEOUT_SECONDS,
    connection: { statement_timeout: statementTimeoutMs },
  };
}

function open(statementTimeoutMs: number, connections: number): Connection {
  const client = postgres(requireDatabaseUrl(), clientOptions(statementTimeoutMs, connections));
  return { database: drizzle(client, { schema }), close: () => client.end({ timeout: 2 }) };
}

let shared: Connection | undefined;

/** The application's database. Connects lazily: nothing is opened until the first query. */
export function getDatabase(): Database {
  shared ??= open(STATEMENT_TIMEOUT_MS, APPLICATION_CONNECTIONS);
  return shared.database;
}

/** Closes the application's client, for scripts and tests; the server never closes it. */
export async function closeDatabase(): Promise<void> {
  await shared?.close();
  shared = undefined;
}

/** A client for running migrations, on one connection without the statement timeout; the caller closes it. */
export function openMigrationDatabase(): Connection {
  return open(MIGRATION_STATEMENT_TIMEOUT_MS, MIGRATION_CONNECTIONS);
}

/**
 * The database client, made on first use, with a statement timeout so a stalled
 * query fails rather than holding a request.
 *
 * decisions/023-database.md
 */

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { requireDatabaseUrl } from "./connection-string";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

/** How long one statement may run, lock waits included, before Postgres cancels it. */
export const STATEMENT_TIMEOUT_MS = 10_000;

let client: ReturnType<typeof postgres> | undefined;
let database: Database | undefined;

/** The database. Connects lazily: nothing is opened until the first query. */
export function getDatabase(): Database {
  if (database === undefined) {
    client = postgres(requireDatabaseUrl(), {
      connection: { statement_timeout: STATEMENT_TIMEOUT_MS },
    });
    database = drizzle(client, { schema });
  }
  return database;
}

/** Closes the client, for scripts and tests; the server never closes it. */
export async function closeDatabase(): Promise<void> {
  await client?.end({ timeout: 2 });
  client = undefined;
  database = undefined;
}

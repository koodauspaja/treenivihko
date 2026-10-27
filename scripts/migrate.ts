/**
 * `npm run db:migrate`: applies the migrations to `DATABASE_URL`'s database,
 * over a client without the application's statement timeout, under the
 * migration lock.
 *
 * decisions/023-database.md
 * decisions/026-railway.md
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { openMigrationDatabase } from "../src/lib/db/index.ts";
import {
  journalTagsIn,
  MIGRATION_JOURNAL,
  MIGRATIONS_FOLDER,
  migrationLock,
  runMigrations,
  sqlFilesIn,
} from "../src/lib/db/migrations.ts";

if (process.env.DATABASE_URL === undefined && existsSync(".env")) {
  process.loadEnvFile(".env");
}

const connection = openMigrationDatabase();
try {
  const run = await runMigrations({
    exists: existsSync,
    sqlFiles: () => sqlFilesIn(existsSync(MIGRATIONS_FOLDER) ? readdirSync(MIGRATIONS_FOLDER) : []),
    journalTags: () => journalTagsIn(readFileSync(MIGRATION_JOURNAL, "utf8")),
    migrate: (folder) => migrate(connection.database, { migrationsFolder: folder }),
    ...migrationLock(connection.database),
  });
  process.stdout.write(run === "none" ? "No migrations yet.\n" : "Migrations applied.\n");
} catch (error) {
  // Drizzle's "Failed query" carries Postgres's reason, such as a lock timeout, as its cause.
  const cause =
    error instanceof Error && error.cause instanceof Error ? `: ${error.cause.message}` : "";
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}${cause}\n`);
  process.exitCode = 1;
} finally {
  await connection.close();
}

/**
 * `npm run db:migrate`: applies the migrations to `DATABASE_URL`'s database,
 * over a client without the application's statement timeout.
 *
 * decisions/023-database.md
 */

import { existsSync, readdirSync } from "node:fs";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { openMigrationDatabase } from "../src/lib/db/index.ts";
import { MIGRATIONS_FOLDER, runMigrations, sqlFilesIn } from "../src/lib/db/migrations.ts";

if (process.env.DATABASE_URL === undefined && existsSync(".env")) {
  process.loadEnvFile(".env");
}

const connection = openMigrationDatabase();
try {
  const run = await runMigrations({
    exists: existsSync,
    sqlFiles: () => sqlFilesIn(existsSync(MIGRATIONS_FOLDER) ? readdirSync(MIGRATIONS_FOLDER) : []),
    migrate: (folder) => migrate(connection.database, { migrationsFolder: folder }),
  });
  process.stdout.write(run === "none" ? "No migrations yet.\n" : "Migrations applied.\n");
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  await connection.close();
}

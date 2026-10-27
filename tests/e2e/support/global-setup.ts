import { existsSync, readdirSync, readFileSync } from "node:fs";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { openMigrationDatabase } from "../../../src/lib/db/index.ts";
import {
  journalTagsIn,
  MIGRATION_JOURNAL,
  MIGRATIONS_FOLDER,
  migrationLock,
  runMigrations,
  sqlFilesIn,
} from "../../../src/lib/db/migrations.ts";

/**
 * Migrates the test database, which `playwright.config.ts` has already
 * checked is a local `_test` one. decisions/f001-trainer-side.md
 */
export default async function prepareTestDatabase(): Promise<void> {
  const migration = openMigrationDatabase();
  try {
    await runMigrations({
      exists: existsSync,
      sqlFiles: () => sqlFilesIn(readdirSync(MIGRATIONS_FOLDER)),
      journalTags: () => journalTagsIn(readFileSync(MIGRATION_JOURNAL, "utf8")),
      migrate: (folder) => migrate(migration.database, { migrationsFolder: folder }),
      ...migrationLock(migration.database),
    });
  } finally {
    await migration.close();
  }
}

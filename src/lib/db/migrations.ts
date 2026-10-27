/**
 * Applies the migrations in `drizzle/migrations`, or nothing when none exist yet.
 *
 * decisions/023-database.md
 */

/** Where drizzle-kit writes migrations, and the journal that lists them. */
export const MIGRATIONS_FOLDER = "drizzle/migrations";
export const MIGRATION_JOURNAL = `${MIGRATIONS_FOLDER}/meta/_journal.json`;

export type MigrationRun = "applied" | "none";

type Steps = {
  /** Whether a file exists. */
  exists: (path: string) => boolean;
  /** The `.sql` files in the migrations folder, which is empty or absent before the first. */
  sqlFiles: () => string[];
  /** Applies every migration not yet applied, from the folder. */
  migrate: (folder: string) => Promise<void>;
};

/**
 * Runs the migrations if there are any. Without a journal drizzle's migrator
 * fails, so "none" means no journal and no SQL file; SQL files without a
 * journal are an error, not nothing to do.
 */
export async function runMigrations(steps: Steps): Promise<MigrationRun> {
  if (!steps.exists(MIGRATION_JOURNAL)) {
    const orphans = steps.sqlFiles();
    if (orphans.length > 0) {
      throw new Error(
        `${MIGRATIONS_FOLDER} has SQL files but no ${MIGRATION_JOURNAL}: ${orphans.join(", ")}`
      );
    }
    return "none";
  }
  await steps.migrate(MIGRATIONS_FOLDER);
  return "applied";
}

/** The `.sql` files among a folder's entries. */
export function sqlFilesIn(entries: readonly string[]): string[] {
  return entries.filter((entry) => entry.endsWith(".sql"));
}

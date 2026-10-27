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
  /** Applies every migration not yet applied, from the folder. */
  migrate: (folder: string) => Promise<void>;
};

/**
 * Runs the migrations if there are any. Without a journal, drizzle's migrator
 * fails, so a project with no migrations yet is answered with "none".
 */
export async function runMigrations(steps: Steps): Promise<MigrationRun> {
  if (!steps.exists(MIGRATION_JOURNAL)) {
    return "none";
  }
  await steps.migrate(MIGRATIONS_FOLDER);
  return "applied";
}

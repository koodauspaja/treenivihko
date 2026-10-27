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
  /** The tags the journal lists, read only when it exists. */
  journalTags: () => string[];
  /** Applies every migration not yet applied, from the folder. */
  migrate: (folder: string) => Promise<void>;
};

/**
 * Runs the migrations if there are any: "none" means no journal and no SQL
 * file. A SQL file the journal does not list is an error, because drizzle's
 * migrator would skip it.
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
  const listed = new Set(steps.journalTags());
  const unlisted = steps.sqlFiles().filter((file) => !listed.has(file.replace(/\.sql$/, "")));
  if (unlisted.length > 0) {
    throw new Error(`${MIGRATION_JOURNAL} does not list: ${unlisted.join(", ")}`);
  }
  await steps.migrate(MIGRATIONS_FOLDER);
  return "applied";
}

/** The tags in a drizzle-kit journal's text. */
export function journalTagsIn(journal: string): string[] {
  return (JSON.parse(journal) as { entries: { tag: string }[] }).entries.map((entry) => entry.tag);
}

/** The `.sql` files among a folder's entries. */
export function sqlFilesIn(entries: readonly string[]): string[] {
  return entries.filter((entry) => entry.endsWith(".sql"));
}

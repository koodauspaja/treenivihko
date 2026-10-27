/**
 * Applies the migrations in `drizzle/migrations`, or nothing when none exist yet,
 * one run at a time.
 *
 * decisions/023-database.md
 * decisions/026-railway.md
 */

import { type SQL, sql } from "drizzle-orm";

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
  /** Waits until no other run holds the migration lock, then holds it. */
  lock: () => Promise<void>;
  /** Releases the migration lock. */
  unlock: () => Promise<void>;
};

/**
 * Runs the migrations if there are any: "none" means no journal and no SQL
 * file. A SQL file the journal does not list is an error, because drizzle's
 * migrator would skip it. Two overlapping deploys would both see a migration
 * as pending, so each run applies it only under the lock.
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
  await steps.lock();
  try {
    await steps.migrate(MIGRATIONS_FOLDER);
  } finally {
    await steps.unlock();
  }
  return "applied";
}

/** The advisory lock every migration run takes: an arbitrary number of this project's own. */
export const MIGRATION_LOCK_KEY = 726_026;

/**
 * Lock and unlock over one database session. A session's advisory lock is
 * released only by the session that took it, so the client has one connection.
 */
export function migrationLock(database: { execute: (query: SQL) => Promise<unknown> }) {
  return {
    lock: async () => {
      await database.execute(sql`select pg_advisory_lock(${MIGRATION_LOCK_KEY})`);
    },
    unlock: async () => {
      await database.execute(sql`select pg_advisory_unlock(${MIGRATION_LOCK_KEY})`);
    },
  };
}

/** The tags in a drizzle-kit journal's text. */
export function journalTagsIn(journal: string): string[] {
  return (JSON.parse(journal) as { entries: { tag: string }[] }).entries.map((entry) => entry.tag);
}

/** The `.sql` files among a folder's entries. */
export function sqlFilesIn(entries: readonly string[]): string[] {
  return entries.filter((entry) => entry.endsWith(".sql"));
}

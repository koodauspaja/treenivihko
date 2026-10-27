import { existsSync, readdirSync, readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase, openMigrationDatabase } from "@/lib/db/index";
import {
  journalTagsIn,
  MIGRATION_LOCK_KEY,
  migrationLock,
  runMigrations,
  sqlFilesIn,
} from "@/lib/db/migrations";

afterAll(async () => {
  await closeDatabase();
});

describe("the test database", () => {
  it("answers a query", async () => {
    const [row] = await getDatabase().execute<{ answer: number }>(sql`select 1 as answer`);
    expect(row?.answer).toBe(1);
  });

  it("is the database the guard allowed", async () => {
    const [row] = await getDatabase().execute<{ name: string }>(
      sql`select current_database() as name`
    );
    expect(row?.name).toMatch(/_test$/);
  });

  it("cancels a statement after ten seconds", async () => {
    const [row] = await getDatabase().execute<{ statement_timeout: string }>(
      sql`show statement_timeout`
    );
    expect(row?.statement_timeout).toBe("10s");
  });

  it("takes the repository's migrations, over a client without the statement timeout", async () => {
    const migration = openMigrationDatabase();
    try {
      const [timeout] = await migration.database.execute<{ statement_timeout: string }>(
        sql`show statement_timeout`
      );
      expect(timeout?.statement_timeout).toBe("0");
      const run = await runMigrations({
        exists: existsSync,
        sqlFiles: () =>
          sqlFilesIn(existsSync("drizzle/migrations") ? readdirSync("drizzle/migrations") : []),
        journalTags: () =>
          journalTagsIn(readFileSync("drizzle/migrations/meta/_journal.json", "utf8")),
        migrate: (folder) => migrate(migration.database, { migrationsFolder: folder }),
        ...migrationLock(migration.database),
      });
      expect(run).toBe(existsSync("drizzle/migrations/meta/_journal.json") ? "applied" : "none");
    } finally {
      await migration.close();
    }
  });

  it("runs a migration client's statements in one session, which the lock needs", async () => {
    const migration = openMigrationDatabase();
    const backend = async () => {
      const [row] = await migration.database.execute<{ pid: number }>(
        sql`select pg_backend_pid() as pid, pg_sleep(0.05)`
      );
      return row?.pid;
    };
    try {
      const pids = await Promise.all([backend(), backend(), backend()]);
      expect(new Set(pids).size).toBe(1);
    } finally {
      await migration.close();
    }
  });

  it("holds the migration lock against a second run until it lets go", async () => {
    const first = openMigrationDatabase();
    const second = openMigrationDatabase();
    const tryLock = async () => {
      const [row] = await second.database.execute<{ taken: boolean }>(
        sql`select pg_try_advisory_lock(${MIGRATION_LOCK_KEY}) as taken`
      );
      return row?.taken;
    };
    try {
      const lock = migrationLock(first.database);
      await lock.lock();
      expect(await tryLock()).toBe(false);
      await lock.unlock();
      expect(await tryLock()).toBe(true);
      await migrationLock(second.database).unlock();
    } finally {
      await first.close();
      await second.close();
    }
  });
});

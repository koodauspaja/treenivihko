import { existsSync, readdirSync, readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase, openMigrationDatabase } from "@/lib/db/index";
import { journalTagsIn, runMigrations, sqlFilesIn } from "@/lib/db/migrations";

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
      });
      expect(run).toBe(existsSync("drizzle/migrations/meta/_journal.json") ? "applied" : "none");
    } finally {
      await migration.close();
    }
  });
});

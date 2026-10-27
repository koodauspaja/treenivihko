import { describe, expect, it, vi } from "vitest";
import {
  MIGRATION_JOURNAL,
  MIGRATIONS_FOLDER,
  runMigrations,
  sqlFilesIn,
} from "@/lib/db/migrations";

describe("runMigrations", () => {
  it("does nothing, and says so, when no migration exists yet", async () => {
    const migrate = vi.fn(async () => {});
    const run = await runMigrations({ exists: () => false, sqlFiles: () => [], migrate });
    expect(run).toBe("none");
    expect(migrate).not.toHaveBeenCalled();
  });

  it("applies the migrations folder when its journal exists", async () => {
    const exists = vi.fn((path: string) => path === MIGRATION_JOURNAL);
    const migrate = vi.fn(async () => {});
    expect(await runMigrations({ exists, sqlFiles: () => [], migrate })).toBe("applied");
    expect(migrate).toHaveBeenCalledWith(MIGRATIONS_FOLDER);
  });

  it("lets a failed migration fail", async () => {
    const migrate = vi.fn(async () => {
      throw new Error("relation already exists");
    });
    await expect(
      runMigrations({ exists: () => true, sqlFiles: () => [], migrate })
    ).rejects.toThrow("relation already exists");
  });

  it("refuses SQL files that have no journal, rather than call them nothing to do", async () => {
    const migrate = vi.fn(async () => {});
    await expect(
      runMigrations({ exists: () => false, sqlFiles: () => ["0000_create_exercises.sql"], migrate })
    ).rejects.toThrow(/SQL files but no .*_journal\.json: 0000_create_exercises\.sql/);
    expect(migrate).not.toHaveBeenCalled();
  });

  it("looks for drizzle-kit's journal inside the migrations folder", () => {
    expect(MIGRATION_JOURNAL).toBe(`${MIGRATIONS_FOLDER}/meta/_journal.json`);
  });
});

describe("sqlFilesIn", () => {
  it("keeps only the .sql files", () => {
    expect(sqlFilesIn(["0000_create_a.sql", "meta", "notes.md", "0001_add_b.sql"])).toEqual([
      "0000_create_a.sql",
      "0001_add_b.sql",
    ]);
  });
});

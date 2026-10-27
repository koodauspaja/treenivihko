import { describe, expect, it, vi } from "vitest";
import {
  journalTagsIn,
  MIGRATION_JOURNAL,
  MIGRATIONS_FOLDER,
  runMigrations,
  sqlFilesIn,
} from "@/lib/db/migrations";

const steps = (overrides: Partial<Parameters<typeof runMigrations>[0]> = {}) => ({
  exists: () => true,
  sqlFiles: () => [],
  journalTags: () => [],
  migrate: vi.fn(async () => {}),
  ...overrides,
});

describe("runMigrations", () => {
  it("does nothing, and says so, when no migration exists yet", async () => {
    const given = steps({ exists: () => false });
    expect(await runMigrations(given)).toBe("none");
    expect(given.migrate).not.toHaveBeenCalled();
  });

  it("applies the migrations folder when its journal exists", async () => {
    const given = steps({
      exists: (path: string) => path === MIGRATION_JOURNAL,
      sqlFiles: () => ["0000_create_a.sql"],
      journalTags: () => ["0000_create_a"],
    });
    expect(await runMigrations(given)).toBe("applied");
    expect(given.migrate).toHaveBeenCalledWith(MIGRATIONS_FOLDER);
  });

  it("lets a failed migration fail", async () => {
    const given = steps({
      migrate: vi.fn(async () => {
        throw new Error("relation already exists");
      }),
    });
    await expect(runMigrations(given)).rejects.toThrow("relation already exists");
  });

  it("refuses SQL files that have no journal, rather than call them nothing to do", async () => {
    const given = steps({ exists: () => false, sqlFiles: () => ["0000_create_exercises.sql"] });
    await expect(runMigrations(given)).rejects.toThrow(
      /SQL files but no .*_journal\.json: 0000_create_exercises\.sql/
    );
    expect(given.migrate).not.toHaveBeenCalled();
  });

  it("refuses a SQL file the journal does not list, which drizzle would skip", async () => {
    const given = steps({
      sqlFiles: () => ["0000_create_a.sql", "0001_add_b.sql"],
      journalTags: () => ["0000_create_a"],
    });
    await expect(runMigrations(given)).rejects.toThrow(/does not list: 0001_add_b\.sql/);
    expect(given.migrate).not.toHaveBeenCalled();
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

describe("journalTagsIn", () => {
  it("reads the tags from a drizzle-kit journal", () => {
    const journal = JSON.stringify({
      version: "7",
      entries: [
        { idx: 0, tag: "0000_create_a" },
        { idx: 1, tag: "0001_add_b" },
      ],
    });
    expect(journalTagsIn(journal)).toEqual(["0000_create_a", "0001_add_b"]);
  });
});

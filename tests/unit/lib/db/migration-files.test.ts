import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MIGRATION_JOURNAL, MIGRATIONS_FOLDER } from "@/lib/db/migrations";
import { MIGRATION_TAG } from "../../../../scripts/migration-name.ts";

describe("the migrations in the repository", () => {
  it("are each named <verb>_<what>, file and journal entry alike", () => {
    const files = existsSync(MIGRATIONS_FOLDER)
      ? readdirSync(MIGRATIONS_FOLDER).filter((file) => file.endsWith(".sql"))
      : [];
    const tags = existsSync(MIGRATION_JOURNAL)
      ? (
          JSON.parse(readFileSync(MIGRATION_JOURNAL, "utf8")) as { entries: { tag: string }[] }
        ).entries.map((entry) => entry.tag)
      : [];
    const unnamed = [...files.map((file) => file.replace(/\.sql$/, "")), ...tags].filter(
      (tag) => !MIGRATION_TAG.test(tag)
    );
    expect(unnamed).toEqual([]);
  });
});

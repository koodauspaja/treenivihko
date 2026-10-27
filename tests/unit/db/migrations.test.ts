import { describe, expect, it, vi } from "vitest";
import { MIGRATION_JOURNAL, MIGRATIONS_FOLDER, runMigrations } from "@/db/migrations";

describe("runMigrations", () => {
  it("does nothing, and says so, when no migration exists yet", async () => {
    const migrate = vi.fn(async () => {});
    const run = await runMigrations({ exists: () => false, migrate });
    expect(run).toBe("none");
    expect(migrate).not.toHaveBeenCalled();
  });

  it("applies the migrations folder when its journal exists", async () => {
    const exists = vi.fn((path: string) => path === MIGRATION_JOURNAL);
    const migrate = vi.fn(async () => {});
    expect(await runMigrations({ exists, migrate })).toBe("applied");
    expect(migrate).toHaveBeenCalledWith(MIGRATIONS_FOLDER);
  });

  it("lets a failed migration fail", async () => {
    const migrate = vi.fn(async () => {
      throw new Error("relation already exists");
    });
    await expect(runMigrations({ exists: () => true, migrate })).rejects.toThrow(
      "relation already exists"
    );
  });

  it("looks for drizzle-kit's journal inside the migrations folder", () => {
    expect(MIGRATION_JOURNAL).toBe(`${MIGRATIONS_FOLDER}/meta/_journal.json`);
  });
});

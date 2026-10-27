import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  closeDatabase,
  getDatabase,
  MIGRATION_STATEMENT_TIMEOUT_MS,
  openMigrationDatabase,
  STATEMENT_TIMEOUT_MS,
} from "@/lib/db/index";

describe("getDatabase", () => {
  const saved = process.env.DATABASE_URL;
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://user:secret@127.0.0.1:1/none";
  });
  afterEach(async () => {
    await closeDatabase();
    process.env.DATABASE_URL = saved;
  });

  it("makes one client and hands back the same one, without connecting", () => {
    expect(getDatabase()).toBe(getDatabase());
  });

  it("requires DATABASE_URL only when first used", () => {
    delete process.env.DATABASE_URL;
    expect(() => getDatabase()).toThrow(/DATABASE_URL is not set/);
  });

  it("makes a new client after closing", async () => {
    const first = getDatabase();
    await closeDatabase();
    expect(getDatabase()).not.toBe(first);
  });

  it("closes cleanly when nothing was opened", async () => {
    await expect(closeDatabase()).resolves.toBeUndefined();
  });

  it("cancels a statement after ten seconds", () => {
    expect(STATEMENT_TIMEOUT_MS).toBe(10_000);
  });
});

describe("openMigrationDatabase", () => {
  const saved = process.env.DATABASE_URL;
  afterEach(() => {
    process.env.DATABASE_URL = saved;
  });

  it("makes a client of its own, apart from the application's, without connecting", async () => {
    process.env.DATABASE_URL = "postgresql://user:secret@127.0.0.1:1/none";
    const migration = openMigrationDatabase();
    expect(migration.database).not.toBe(getDatabase());
    await migration.close();
    await closeDatabase();
  });

  it("does not cancel a migration's statements", () => {
    expect(MIGRATION_STATEMENT_TIMEOUT_MS).toBe(0);
  });
});

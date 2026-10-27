import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase, STATEMENT_TIMEOUT_MS } from "@/db/index";

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

import { describe, expect, it } from "vitest";
import { requireDatabaseUrl } from "@/db/connection-string";

describe("requireDatabaseUrl", () => {
  it("gives the connection string, trimmed", () => {
    expect(requireDatabaseUrl({ DATABASE_URL: " postgresql://h/db " })).toBe("postgresql://h/db");
  });

  it.each([
    ["unset", {}],
    ["empty", { DATABASE_URL: "" }],
    ["blank", { DATABASE_URL: "  " }],
  ])("refuses a connection string that is %s, and says where to set it", (_name, env) => {
    expect(() => requireDatabaseUrl(env)).toThrow(/DATABASE_URL is not set.*\.env\.example/);
  });

  it("reads the process environment by default", () => {
    const saved = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://h/from-env";
    try {
      expect(requireDatabaseUrl()).toBe("postgresql://h/from-env");
    } finally {
      process.env.DATABASE_URL = saved;
    }
  });
});

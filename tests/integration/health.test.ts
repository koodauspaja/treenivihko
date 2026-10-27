import { afterAll, describe, expect, it, vi } from "vitest";
import { closeDatabase } from "@/lib/db/index";

// Outside a Next request there is no request scope to wait for.
vi.mock("next/server", () => ({ connection: async () => {} }));

const { GET } = await import("@/app/api/health/route");

afterAll(async () => {
  await closeDatabase();
});

describe("GET /api/health against the test database", () => {
  it("answers 200, with the database ok, from the query Postgres runs", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", database: "ok" });
  });
});

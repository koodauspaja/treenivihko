import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();
const connection = vi.fn(async () => {});

vi.mock("next/server", () => ({ connection: () => connection() }));
vi.mock("@/lib/db/index", () => ({ getDatabase: () => ({ execute }) }));

const { GET } = await import("@/app/api/health/route");

beforeEach(() => {
  execute.mockReset();
  connection.mockClear();
  vi.stubEnv("RAILWAY_GIT_COMMIT_SHA", "abc123");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/health", () => {
  it("answers 200 with the commit when the database answers", async () => {
    execute.mockResolvedValue([{ "?column?": 1 }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", database: "ok", commit: "abc123" });
  });

  it("answers 503 when the database does not", async () => {
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    execute.mockRejectedValue(new Error("connect ECONNREFUSED"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: "unavailable",
      database: "unreachable",
      commit: "abc123",
    });
  });

  it("runs at request time and is never cached", async () => {
    execute.mockResolvedValue([]);
    const response = await GET();
    expect(connection).toHaveBeenCalledOnce();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});

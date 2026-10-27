import { afterEach, describe, expect, it, vi } from "vitest";
import { checkHealth, DATABASE_TIMEOUT_MS } from "@/lib/health/check";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("checkHealth", () => {
  it("is ok, with the commit, when the database answers", async () => {
    expect(await checkHealth(async () => [{ "?column?": 1 }], "abc123")).toEqual({
      status: "ok",
      database: "ok",
      commit: "abc123",
    });
  });

  it("is unavailable when the database refuses, and logs why without failing", async () => {
    const report = vi.fn();
    const health = await checkHealth(
      async () => {
        throw new Error("connect ECONNREFUSED");
      },
      "abc123",
      { report }
    );
    expect(health).toEqual({ status: "unavailable", database: "unreachable", commit: "abc123" });
    expect(report).toHaveBeenCalledWith(
      "health check: the database did not answer: connect ECONNREFUSED"
    );
  });

  it("is unavailable when getting a client throws before any promise exists", async () => {
    const health = await checkHealth(
      () => {
        throw new Error("DATABASE_URL is not set");
      },
      undefined,
      { report: vi.fn() }
    );
    expect(health.database).toBe("unreachable");
  });

  it("waits three seconds for the database, well inside Railway's 60", () => {
    expect(DATABASE_TIMEOUT_MS).toBe(3_000);
  });

  it("gives up on a database that never answers", async () => {
    vi.useFakeTimers();
    const report = vi.fn();
    const pending = checkHealth(() => new Promise(() => {}), "abc123", { report });
    await vi.advanceTimersByTimeAsync(DATABASE_TIMEOUT_MS - 1);
    expect(report).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect((await pending).status).toBe("unavailable");
    expect(report).toHaveBeenCalledWith(
      `health check: the database did not answer: no answer in ${DATABASE_TIMEOUT_MS} ms`
    );
  });

  it("leaves no timer behind once the database has answered", async () => {
    vi.useFakeTimers();
    await checkHealth(async () => [], "abc123");
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    [undefined, null],
    ["", null],
    ["  ", null],
    [" abc123 ", "abc123"],
  ])("reports the commit %j as %j", async (commit, expected) => {
    expect((await checkHealth(async () => [], commit)).commit).toBe(expected);
  });

  it.each([
    [
      "the driver's reason behind Drizzle's",
      new Error("Failed query: select 1", { cause: new Error("connect ECONNREFUSED") }),
      "Failed query: select 1: connect ECONNREFUSED",
    ],
    ["a cause that is not an error, left out", new Error("boom", { cause: "text" }), "boom"],
    ["a thrown string as it is", "a bare string", "a bare string"],
    ["anything else thrown as what it is not", { code: 1 }, "a value that is not an Error"],
  ])("records %s", async (_case, thrown, reason) => {
    const report = vi.fn();
    await checkHealth(
      async () => {
        throw thrown;
      },
      undefined,
      { report }
    );
    expect(report).toHaveBeenCalledWith(`health check: the database did not answer: ${reason}`);
  });

  it("records a failure on stderr by default", async () => {
    const write = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    await checkHealth(async () => {
      throw new Error("connect ECONNREFUSED");
    }, "abc123");
    expect(write).toHaveBeenCalledWith(
      "health check: the database did not answer: connect ECONNREFUSED\n"
    );
  });
});

import { describe, expect, it } from "vitest";
import { logged, reasonOf } from "@/lib/db/logged";

describe("reasonOf", () => {
  it("takes Postgres's reason from the cause, and never the query", () => {
    const failure = new Error("Failed query: insert ... params: secret", {
      cause: new Error('violates check constraint "x"'),
    });
    expect(reasonOf(failure)).toBe('violates check constraint "x"');
  });

  it("falls back to the message, or the value itself", () => {
    expect(reasonOf(new Error("plain"))).toBe("plain");
    expect(reasonOf("text")).toBe("text");
  });
});

describe("logged", () => {
  it("hands back what the work returns, and logs nothing", async () => {
    const lines: string[] = [];
    expect(
      await logged(
        "event",
        "user u1",
        (line) => lines.push(line),
        async () => 7
      )
    ).toBe(7);
    expect(lines).toEqual([]);
  });

  it("logs a failure with its event and ids, and passes on only that line", async () => {
    const lines: string[] = [];
    const failure = new Error("Failed query: params: secret", { cause: new Error("the reason") });
    const run = logged(
      "child created",
      "user u1",
      (line) => lines.push(line),
      async () => {
        throw failure;
      }
    );
    await expect(run).rejects.toThrow("child created failed: user u1: the reason");
    await run.catch((error: Error) => {
      expect(error.message).not.toContain("secret");
      expect(error.cause).toBeUndefined();
    });
    expect(lines).toEqual(["child created failed: user u1: the reason"]);
  });
});

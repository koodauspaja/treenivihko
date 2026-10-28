import { describe, expect, it } from "vitest";
import { markLine, previousHeading } from "@/lib/marks/messages";
import { markPath } from "@/lib/notebook/paths";

describe("the marks' messages", () => {
  it("says how a session went, with its day and face", () => {
    expect(markLine("done", "3.11.2026", "😄")).toBe("Tehty 3.11.2026 😄");
    expect(markLine("partly", "3.11.2026")).toBe("Osittain 3.11.2026");
    expect(markLine("not_done", "")).toBe("Ei tehty");
  });

  it("names the previous period", () => {
    expect(previousHeading("20.10.–2.11.2026")).toBe("Edellinen jakso 20.10.–2.11.2026");
  });

  it("addresses a session's marking page by its id", () => {
    expect(markPath("a b/c")).toBe("/treeni/a%20b%2Fc");
  });
});

import { describe, expect, it } from "vitest";
import { sessionLine, startsOn } from "@/lib/notebook/messages";
import { notebookExercisePath } from "@/lib/notebook/paths";

describe("the notebook's messages", () => {
  it("says when the next period starts, and a session's place and target", () => {
    expect(startsOn("17.11.2026")).toBe("Alkaa 17.11.2026.");
    expect(sessionLine("Kenttä", 45)).toBe("Kenttä · 45 min");
  });

  it("addresses an exercise by its block exercise's id", () => {
    expect(notebookExercisePath("a b/c")).toBe("/harjoite/a%20b%2Fc");
  });
});

import { describe, expect, it } from "vitest";
import { characterCount, tidy } from "@/lib/text";

describe("text as a person counts it", () => {
  it("trims, and keeps one form of each character", () => {
    expect(tidy("  Äijä ")).toBe("Äijä");
  });

  it("counts characters, not UTF-16 units or combining marks", () => {
    expect(characterCount("Äijä")).toBe(4);
    expect(characterCount("😀😀")).toBe(2);
    expect(characterCount("")).toBe(0);
  });
});

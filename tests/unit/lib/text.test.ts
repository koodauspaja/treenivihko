import { describe, expect, it } from "vitest";
import {
  characterCount,
  storedLength,
  tidy,
  unstorable,
  WHITESPACE,
  WHITESPACE_SQL,
} from "@/lib/text";

describe("text as a person counts it", () => {
  it("lists exactly the whitespace JavaScript's trim removes", () => {
    const trimmedByJs: string[] = [];
    for (let code = 0; code <= 0xffff; code++) {
      const character = String.fromCharCode(code);
      if (character.trim() === "") {
        trimmedByJs.push(character);
      }
    }
    expect([...WHITESPACE].sort()).toEqual(trimmedByJs.sort());
  });

  it("trims that whitespace from the ends only, keeps one form of each character, and reads a line break as one", () => {
    expect(tidy("\u00a0 A\u0308ija\u0308\u3000\ufeff")).toBe("\u00c4ij\u00e4");
    expect(tidy("yksi\r\nkaksi\rkolme\n")).toBe("yksi\nkaksi\nkolme");
    expect(tidy("a \u00a0 b")).toBe("a \u00a0 b");
    expect(tidy(" \t ")).toBe("");
  });

  it("counts characters as typed once tidied, and as stored when not", () => {
    expect(characterCount("A\u0308ija\u0308")).toBe(4);
    expect(characterCount("\u{1f600}\u{1f600}")).toBe(2);
    expect(storedLength("A\u0308")).toBe(2);
    expect(storedLength("\u{1f600}")).toBe(1);
  });

  it("finds U+0000, which Postgres refuses, and a lone surrogate, which it would replace", () => {
    expect(unstorable("a\u0000b")).toBe(true);
    expect(unstorable("a\ud800b")).toBe(true);
    expect(unstorable("a\udfffb")).toBe(true);
    expect(unstorable("ab")).toBe(false);
    // A pair is one character, kept as it is.
    expect(unstorable("a\ud83d\ude00b")).toBe(false);
  });

  it("writes the list as a Postgres escape string", () => {
    expect(WHITESPACE_SQL).toMatch(/^E'(\\u[0-9a-f]{4})+'$/);
    expect(WHITESPACE_SQL.slice(2, -1).split("\\u").slice(1)).toHaveLength(WHITESPACE.length);
    expect(WHITESPACE_SQL).toContain("\\u3000");
  });
});

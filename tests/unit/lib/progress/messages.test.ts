import { describe, expect, it } from "vitest";
import { countsLine, doneLine, pickLine } from "@/lib/progress/messages";

describe("the progress's messages", () => {
  it("counts a period's sessions done", () => {
    expect(doneLine(4, 6)).toBe("Tehty 4/6");
    expect(doneLine(0, 1)).toBe("Tehty 0/1");
  });

  it("gives an exercise's counts in the marking page's order, leaving out those of 0", () => {
    expect(countsLine({ likedBest: 4, likedLeast: 0, easiest: 1, hardest: 2 })).toBe(
      "Kivoin 4 · Helpoin 1 · Vaikein 2"
    );
    expect(countsLine({ likedBest: 0, likedLeast: 3, easiest: 0, hardest: 0 })).toBe("Tylsin 3");
  });

  it("names a pick of a mark on the trainer side", () => {
    expect(pickLine("likedBest", "Lähdöt")).toBe("Kivoin: Lähdöt");
    expect(pickLine("likedLeast", "Lähdöt")).toBe("Tylsin: Lähdöt");
    expect(pickLine("easiest", "Lähdöt")).toBe("Helpoin: Lähdöt");
    expect(pickLine("hardest", "Lähdöt")).toBe("Vaikein: Lähdöt");
  });
});

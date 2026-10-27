import { describe, expect, it } from "vitest";
import { added, confirmDelete, exerciseCount } from "@/lib/exercises/messages";

describe("the library's messages", () => {
  it("counts exercises in Finnish", () => {
    expect(exerciseCount(0)).toBe("0 harjoitetta");
    expect(exerciseCount(1)).toBe("1 harjoite");
    expect(exerciseCount(2)).toBe("2 harjoitetta");
  });

  it("names the exercise added or about to be deleted", () => {
    expect(added("Tikkaat")).toBe("Lisätty: Tikkaat.");
    expect(confirmDelete("Tikkaat")).toBe("Poistetaanko harjoite Tikkaat?");
  });
});

import { describe, expect, it } from "vitest";
import {
  added,
  CHANGED_MEANWHILE,
  confirmDelete,
  exerciseCount,
  SAVE_ANYWAY,
  SHOW_CURRENT,
} from "@/lib/exercises/messages";

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

  it("says a save was refused as changed meanwhile, and how to go on", () => {
    expect(CHANGED_MEANWHILE).toBe(
      "Harjoitetta on muutettu muualla sen jälkeen, kun avasit sen. Tallennus ei korvannut muutosta."
    );
    expect(SHOW_CURRENT).toBe("Näytä nykyinen");
    expect(SAVE_ANYWAY).toBe("Tallenna silti");
  });
});

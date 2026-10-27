import { describe, expect, it } from "vitest";
import { isRowId } from "@/lib/db/ids";

describe("isRowId", () => {
  it("takes a UUID as the stores make them", () => {
    expect(isRowId("0b7a3c4e-1f2d-4a5b-8c9d-0e1f2a3b4c5d")).toBe(true);
  });

  it("refuses anything else, a prefix or a suffix included", () => {
    for (const id of [
      "",
      "e1",
      "0B7A3C4E-1F2D-4A5B-8C9D-0E1F2A3B4C5D",
      "0b7a3c4e-1f2d-4a5b-8c9d-0e1f2a3b4c5",
      "0b7a3c4e-1f2d-4a5b-8c9d-0e1f2a3b4c5d0",
      "x0b7a3c4e-1f2d-4a5b-8c9d-0e1f2a3b4c5d",
      "0b7a3c4e-1f2d-4a5b-8c9d-0e1f2a3b4c5\u0000",
    ]) {
      expect(isRowId(id)).toBe(false);
    }
  });
});

import { describe, expect, it } from "vitest";
import { LABEL_KEYS, LABELS, labelOf, labelsIn } from "@/lib/exercises/labels";

describe("the label list", () => {
  it("has 11 skills, 3 places and 7 equipment items, each key once", () => {
    expect(labelsIn("skill").map((label) => label.name)).toEqual([
      "Kuljetus",
      "Harhautus",
      "Syöttö",
      "Laukaus",
      "Pallonhallinta",
      "Jalkatyö",
      "Nopeus",
      "Ketteryys",
      "Tasapaino",
      "Voima",
      "Liikkuvuus",
    ]);
    expect(labelsIn("place").map((label) => label.name)).toEqual([
      "Kenttä",
      "Sisällä",
      "Kuntosali",
    ]);
    expect(labelsIn("equipment").map((label) => label.name)).toEqual([
      "Pallo",
      "Tikkaat",
      "Aidat",
      "Kartiot",
      "Maali",
      "Seinä",
      "Hyppynaru",
    ]);
    expect(new Set(LABEL_KEYS).size).toBe(21);
    expect(LABELS.every((label) => /^[a-z_]+$/.test(label.key) && label.meaning.length > 0)).toBe(
      true
    );
  });

  it("finds a label by key, and none for a key not on the list", () => {
    expect(labelOf("goal")).toMatchObject({ group: "equipment", name: "Maali" });
    expect(labelOf("heading")).toBeUndefined();
  });
});

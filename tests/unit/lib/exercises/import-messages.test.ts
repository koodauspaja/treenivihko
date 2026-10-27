import { describe, expect, it } from "vitest";
import {
  failingCount,
  failingHeading,
  IMPORT_PROMPT,
  imported,
  notAList,
  unknownField,
  unknownLabel,
} from "@/lib/exercises/import-messages";
import { LABELS, labelsIn } from "@/lib/exercises/labels";

describe("the import's messages", () => {
  it("count an import and its failures, one and many", () => {
    expect(imported(1)).toBe("Tuotu 1 harjoite.");
    expect(imported(3)).toBe("Tuotu 3 harjoitetta.");
    expect(failingCount(1)).toBe("1 harjoite ei kelpaa. Mitään ei tallennettu.");
    expect(failingCount(2)).toBe("2 harjoitetta ei kelpaa. Mitään ei tallennettu.");
  });

  it("head a failing exercise by its position, and its name when it has one", () => {
    expect(failingHeading(3, "Tikkaat")).toBe("Harjoite 3: Tikkaat");
    expect(failingHeading(4, null)).toBe("Harjoite 4");
  });

  it("name an unknown field, a label group not given as a list, and an unknown label", () => {
    expect(unknownField("välineet")).toBe("Tuntematon kenttä: välineet.");
    expect(notAList("skill")).toBe("Taidot on annettava listana.");
    expect(notAList("place")).toBe("Paikat on annettava listana.");
    expect(notAList("equipment")).toBe("Välineet on annettava listana.");
    expect(unknownLabel("skill", "Tikkaat")).toBe("Tuntematon taito: Tikkaat.");
    expect(unknownLabel("place", "Ranta")).toBe("Tuntematon paikka: Ranta.");
    expect(unknownLabel("equipment", "Mailat")).toBe("Tuntematon väline: Mailat.");
  });
});

describe("the prompt for an AI tool", () => {
  it("names every label with its meaning, group by group, in the list's order", () => {
    const lines = IMPORT_PROMPT.split("\n");
    for (const [heading, group] of [
      ["Taidot:", "skill"],
      ["Paikat:", "place"],
      ["Välineet:", "equipment"],
    ] as const) {
      const start = lines.indexOf(heading) + 1;
      const listed = lines.slice(start, start + labelsIn(group).length);
      expect(listed).toEqual(labelsIn(group).map((label) => `- ${label.name}: ${label.meaning}`));
    }
    expect(LABELS.every((label) => IMPORT_PROMPT.includes(`- ${label.name}: `))).toBe(true);
  });

  it("asks for the format's fields, its limits and bare JSON", () => {
    expect(IMPORT_PROMPT.startsWith("Tee jalkapallo- ja liikuntaharjoitteita lapselle")).toBe(true);
    for (const field of [
      '"nimi"',
      '"ohje"',
      '"videolinkki"',
      '"kertaa"',
      '"sekuntia"',
      '"kesto_min"',
      '"taso"',
      '"lammittely"',
      '"taidot"',
      '"paikat"',
      '"valineet"',
    ]) {
      expect(IMPORT_PROMPT).toContain(field);
    }
    expect(IMPORT_PROMPT).toContain("enintään 100 harjoitetta");
    expect(IMPORT_PROMPT).toContain("ilman muuta tekstiä ennen tai jälkeen");
    expect(IMPORT_PROMPT.endsWith(`- Hyppynaru: ${labelsIn("equipment").at(-1)?.meaning}`)).toBe(
      true
    );
  });
});

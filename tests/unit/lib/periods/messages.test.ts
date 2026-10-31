import { describe, expect, it } from "vitest";
import {
  ADAPT,
  ADAPT_HELP,
  CHANGES_HEADING,
  changeLine,
  confirmDeleteBlock,
  confirmDeletePeriod,
  confirmDeleteSession,
  copiedFrom,
  createdHeading,
  exerciseInUse,
  lengthLine,
  NO_CHANGES,
  OPEN_PERIOD,
  overlapsWith,
  overTarget,
  periodHeading,
  pickerFilters,
  pickerHeading,
  sessionCount,
  sessionHeading,
  sessionLine,
  weeksLabel,
} from "@/lib/periods/messages";

describe("the periods' messages", () => {
  it("names a length in weeks", () => {
    expect(weeksLabel(1)).toBe("1 viikko");
    expect(weeksLabel(2)).toBe("2 viikkoa");
    expect(weeksLabel(4)).toBe("4 viikkoa");
  });

  it("counts a period's sessions", () => {
    expect(sessionCount(0)).toBe("ei treenejä");
    expect(sessionCount(1)).toBe("1 treeni");
    expect(sessionCount(2)).toBe("2 treeniä");
  });

  it("heads a period, a session and the picker", () => {
    expect(periodHeading("3.11.–16.11.2026")).toBe("Jakso 3.11.–16.11.2026");
    expect(sessionHeading(3)).toBe("Treeni 3");
    expect(pickerHeading("Lämmittely")).toBe("Lisää harjoite osioon Lämmittely");
  });

  it("says what a new period starts from", () => {
    expect(copiedFrom("3.11.–16.11.2026")).toBe(
      "Uusi jakso alkaa kopiona jaksosta 3.11.–16.11.2026."
    );
  });

  it("asks before each deletion", () => {
    expect(confirmDeletePeriod("3.11.–16.11.2026")).toBe(
      "Poistetaanko jakso 3.11.–16.11.2026 ja sen treenit?"
    );
    expect(confirmDeleteSession(2)).toBe("Poistetaanko treeni 2?");
    expect(confirmDeleteBlock("Kuljetus")).toBe("Poistetaanko osio Kuljetus?");
  });

  it("shows a session's length against its target", () => {
    expect(sessionLine("Kenttä", 40, 45)).toBe("Kenttä, 40 / 45 min");
    expect(lengthLine(40, 45)).toBe("Yhteensä 40 min, tavoite 45 min");
    expect(overTarget(5)).toBe("Yli tavoitteen 5 min.");
  });

  it("says what the picker filters by, or that nothing is at hand", () => {
    expect(pickerFilters("Kenttä", ["Pallo", "Kartiot"])).toBe(
      "Paikka: Kenttä. Välineet: Pallo, Kartiot."
    );
    expect(pickerFilters("Sisällä", [])).toBe("Paikka: Sisällä. Välineet: ei välineitä.");
  });

  it("names the period an overlap is with, and the periods using an exercise", () => {
    expect(overlapsWith("3.11.–16.11.2026")).toBe(
      "Jakso menee päällekkäin jakson 3.11.–16.11.2026 kanssa."
    );
    expect(exerciseInUse(["3.11.–16.11.2026", "17.11.–30.11.2026"])).toBe(
      "Harjoite on käytössä jaksoissa: 3.11.–16.11.2026, 17.11.–30.11.2026. Poista se ensin niiden treeneistä."
    );
  });

  it("words the choice to adapt, and what an adapted copy shows", () => {
    expect(ADAPT).toBe("Sovita edellisen jakson merkintöihin");
    expect(ADAPT_HELP).toBe(
      "Määrät nousevat hyvin menneissä treeneissä ja laskevat raskaissa. Vähiten mieluisa harjoite vaihtuu samankaltaiseen ja helpoin vaikeampaan."
    );
    expect(createdHeading("3.11.–16.11.2026")).toBe("Jakso 3.11.–16.11.2026 luotu");
    expect(CHANGES_HEADING).toBe("Merkintöjen mukaan muutettu:");
    expect(NO_CHANGES).toBe("Merkinnät eivät muuttaneet mitään.");
    expect(OPEN_PERIOD).toBe("Avaa jakso");
  });

  it("words an amount's change and a swap, with the amounts as the library shows them", () => {
    expect(
      changeLine({
        kind: "amount",
        id: "b1",
        session: 2,
        name: "Kuljetus kartioilla",
        amountKind: "count",
        from: 10,
        to: 12,
      })
    ).toBe("Treeni 2: Kuljetus kartioilla 10 kertaa → 12 kertaa");
    expect(
      changeLine({
        kind: "amount",
        id: "b2",
        session: 1,
        name: "Pikajuoksu",
        amountKind: "time",
        from: 85,
        to: 100,
      })
    ).toBe("Treeni 1: Pikajuoksu 1 min 25 s → 1 min 40 s");
    expect(
      changeLine({
        kind: "swap",
        id: "b3",
        session: 3,
        from: "Kuljetus",
        to: "Harhautus",
        amountKind: "time",
        amount: 30,
      })
    ).toBe("Treeni 3: Kuljetus vaihtui harjoitteeseen Harhautus (30 s)");
  });
});

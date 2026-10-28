/**
 * Each field of a period, a session and a block at its boundaries, and the
 * arithmetic the pages show.
 *
 * decisions/f004-periods-and-sessions.md
 */

import { describe, expect, it } from "vitest";
import {
  currentOf,
  fits,
  latestOf,
  NEW_SESSION,
  newPeriodDates,
  overBy,
  overlapping,
  readBlockAmount,
  readPeriodDates,
  readSessionSettings,
  readTheme,
  shownOf,
  totalMinutes,
} from "@/lib/periods/rules";

const period = (id: string, startsOn: string, weeks: number) => ({ id, startsOn, weeks });

describe("readPeriodDates", () => {
  it("takes a date and a length of 1 to 4 weeks", () => {
    expect(readPeriodDates(" 2026-11-03 ", "2")).toEqual({
      ok: true,
      dates: { startsOn: "2026-11-03", weeks: 2 },
    });
    expect(readPeriodDates("2026-11-03", "1")).toMatchObject({ ok: true });
    expect(readPeriodDates("2026-11-03", "4")).toMatchObject({ ok: true });
  });

  it("refuses a missing or impossible date", () => {
    for (const startsOn of ["", "2026-02-30", "3.11.2026"]) {
      expect(readPeriodDates(startsOn, "2")).toEqual({
        ok: false,
        errors: { startsOn: "Anna alkamispäivä." },
      });
    }
  });

  it("refuses a period that would end past the year 9999", () => {
    expect(readPeriodDates("9999-12-25", "1")).toMatchObject({ ok: true });
    expect(readPeriodDates("9999-12-26", "1")).toEqual({
      ok: false,
      errors: { startsOn: "Anna alkamispäivä." },
    });
  });

  it("refuses a length other than 1 to 4 weeks, with both refusals at once", () => {
    for (const weeks of ["0", "5", "", "2.5", "x"]) {
      expect(readPeriodDates("2026-11-03", weeks)).toEqual({
        ok: false,
        errors: { weeks: "Valitse kesto." },
      });
    }
    expect(readPeriodDates("", "9")).toEqual({
      ok: false,
      errors: { startsOn: "Anna alkamispäivä.", weeks: "Valitse kesto." },
    });
  });
});

describe("a period's neighbours", () => {
  const first = period("p1", "2026-11-03", 2); // to 16.11.
  const second = period("p2", "2026-11-17", 1); // to 23.11.

  it("finds the period sharing a day, at either end, and none for the next day", () => {
    expect(overlapping([first], { startsOn: "2026-11-16", weeks: 1 })).toBe(first);
    expect(overlapping([first], { startsOn: "2026-10-28", weeks: 1 })).toBe(first);
    expect(overlapping([first], { startsOn: "2026-10-27", weeks: 1 })).toBeUndefined();
    expect(overlapping([first], { startsOn: "2026-11-17", weeks: 1 })).toBeUndefined();
    expect(overlapping([first, second], { startsOn: "2026-11-20", weeks: 1 })).toBe(second);
  });

  it("leaves out the period being moved", () => {
    expect(overlapping([first], { startsOn: "2026-11-04", weeks: 2 }, "p1")).toBeUndefined();
    expect(overlapping([first, second], { startsOn: "2026-11-04", weeks: 2 }, "p1")).toBe(second);
  });

  it("finds the current period from its first day to its last", () => {
    expect(currentOf([first, second], "2026-11-03")).toBe(first);
    expect(currentOf([first, second], "2026-11-16")).toBe(first);
    expect(currentOf([first, second], "2026-11-17")).toBe(second);
    expect(currentOf([first, second], "2026-11-24")).toBeUndefined();
    expect(currentOf([first], "2026-11-02")).toBeUndefined();
  });

  it("shows the current period on the child's side, from its first day to its last", () => {
    expect(shownOf([second, first], "2026-11-03")).toBe(first);
    expect(shownOf([second, first], "2026-11-16")).toBe(first);
    expect(shownOf([second, first], "2026-11-17")).toBe(second);
  });

  it("shows the one that starts first when none is current, and never an earlier one", () => {
    const later = period("p4", "2026-12-01", 1);
    expect(shownOf([later, second, first], "2026-11-01")).toBe(first);
    expect(shownOf([first, later, second], "2026-11-01")).toBe(first);
    expect(shownOf([first, later], "2026-11-20")).toBe(later);
    expect(shownOf([first, second], "2026-11-24")).toBeUndefined();
    expect(shownOf([], "2026-11-24")).toBeUndefined();
  });

  it("takes as latest the period that ends last, whatever their order", () => {
    const long = period("p3", "2026-11-17", 4);
    expect(latestOf([])).toBeUndefined();
    expect(latestOf([second, first])).toBe(second);
    expect(latestOf([first, second])).toBe(second);
    expect(latestOf([long, second, first])).toBe(long);
  });

  it("starts a new period the day after the latest, with its length, or today for 2 weeks", () => {
    expect(newPeriodDates(undefined, "2026-11-03")).toEqual({ startsOn: "2026-11-03", weeks: 2 });
    expect(newPeriodDates(period("p", "2026-12-21", 2), "2026-11-03")).toEqual({
      startsOn: "2027-01-04",
      weeks: 2,
    });
    expect(newPeriodDates(period("p", "2026-11-03", 3), "2026-11-03")).toEqual({
      startsOn: "2026-11-24",
      weeks: 3,
    });
  });

  it("leaves the start empty after a period ending on the last day there is", () => {
    expect(newPeriodDates(period("p", "9999-12-11", 3), "2026-11-03")).toEqual({
      startsOn: "",
      weeks: 3,
    });
    expect(newPeriodDates(period("p", "9999-12-10", 3), "2026-11-03")).toEqual({
      startsOn: "9999-12-31",
      weeks: 3,
    });
  });
});

describe("readTheme", () => {
  it("takes 1 to 30 characters, trimmed", () => {
    expect(readTheme("  Lämmittely ")).toBe("Lämmittely");
    expect(readTheme("a")).toBe("a");
    expect(readTheme("a".repeat(30))).toBe("a".repeat(30));
  });

  it("counts a character as the nickname does, so a composed letter is one", () => {
    expect(readTheme("ä".repeat(30))).toBe("ä".repeat(30));
    expect(readTheme("😀".repeat(30))).toBe("😀".repeat(30));
  });

  it("refuses nothing, 31 characters, and what Postgres cannot store", () => {
    expect(readTheme("")).toBeNull();
    expect(readTheme("   ")).toBeNull();
    expect(readTheme("a".repeat(31))).toBeNull();
    expect(readTheme("a\u0000b")).toBeNull();
    expect(readTheme("a\uD800b")).toBeNull();
  });
});

describe("readSessionSettings", () => {
  it("takes a place, the equipment in the library's order, and a target", () => {
    expect(readSessionSettings("indoors", ["cones", "ball"], "45")).toEqual({
      ok: true,
      settings: { place: "indoors", equipment: ["ball", "cones"], targetMinutes: 45 },
    });
  });

  it("takes no equipment, and drops a key that is not equipment", () => {
    expect(readSessionSettings("field", [], "5")).toMatchObject({
      ok: true,
      settings: { equipment: [] },
    });
    expect(readSessionSettings("field", ["ball", "gym", "nothing", "ball"], "120")).toMatchObject({
      ok: true,
      settings: { equipment: ["ball"], targetMinutes: 120 },
    });
  });

  it("refuses a missing place, or a key that is not a place", () => {
    for (const place of ["", "ball", "nothing"]) {
      expect(readSessionSettings(place, [], "45")).toEqual({
        ok: false,
        errors: { place: "Valitse paikka." },
      });
    }
  });

  it("refuses a target outside 5 to 120, or off its steps of 5", () => {
    const refused = "Tavoitekeston on oltava 5–120 minuuttia, 5 minuutin välein.";
    for (const target of ["0", "4", "7", "121", "125", "", "45.0", "x"]) {
      expect(readSessionSettings("field", [], target)).toEqual({
        ok: false,
        errors: { target: refused },
      });
    }
    expect(readSessionSettings("", [], "7")).toEqual({
      ok: false,
      errors: { place: "Valitse paikka.", target: refused },
    });
  });

  it("starts a new session on the field, with every item at hand, for 45 minutes", () => {
    expect(NEW_SESSION).toEqual({
      place: "field",
      equipment: ["ball", "ladder", "hurdles", "cones", "goal", "wall", "jump_rope"],
      targetMinutes: 45,
    });
  });
});

describe("readBlockAmount", () => {
  it("takes a count from 1 to 100", () => {
    expect(readBlockAmount("count", "1")).toEqual({ ok: true, amount: 1 });
    expect(readBlockAmount("count", "100")).toEqual({ ok: true, amount: 100 });
    for (const input of ["0", "101", "", "1.5"]) {
      expect(readBlockAmount("count", input)).toEqual({
        ok: false,
        error: "Kertoja on oltava 1–100.",
      });
    }
  });

  it("takes a time from 5 to 600 seconds in steps of 5", () => {
    expect(readBlockAmount("time", "5")).toEqual({ ok: true, amount: 5 });
    expect(readBlockAmount("time", "600")).toEqual({ ok: true, amount: 600 });
    for (const input of ["0", "4", "7", "605", ""]) {
      expect(readBlockAmount("time", input)).toEqual({
        ok: false,
        error: "Ajan on oltava 5 s – 10 min, 5 sekunnin välein.",
      });
    }
  });
});

describe("a session's exercises", () => {
  it("fit when they have the place and every item they need is at hand", () => {
    expect(fits(["passing", "field", "ball"], "field", ["ball", "cones"])).toBe(true);
    expect(fits(["passing", "field"], "field", [])).toBe(true);
    expect(fits(["passing", "indoors", "field"], "indoors", [])).toBe(true);
    expect(fits(["passing", "indoors", "ball"], "field", ["ball"])).toBe(false);
    expect(fits(["passing", "field", "ball", "goal"], "field", ["ball"])).toBe(false);
  });

  it("add up to the session's length, and say how far it goes over its target", () => {
    expect(totalMinutes([])).toBe(0);
    expect(totalMinutes([{ durationMinutes: 5 }, { durationMinutes: 10 }])).toBe(15);
    expect(overBy(45, 45)).toBeNull();
    expect(overBy(40, 45)).toBeNull();
    expect(overBy(50, 45)).toBe(5);
  });
});

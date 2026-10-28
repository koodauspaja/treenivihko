import { describe, expect, it } from "vitest";
import { NO_PICKS } from "@/lib/marks/rules";
import { today } from "@/lib/periods/dates";
import {
  countPicks,
  doneCount,
  type ExerciseCounts,
  ranked,
  startedOf,
} from "@/lib/progress/rules";

describe("startedOf", () => {
  const periods = [
    { id: "older", startsOn: "2026-10-20", weeks: 2 },
    { id: "next", startsOn: "2026-11-17", weeks: 2 },
    { id: "current", startsOn: "2026-11-03", weeks: 2 },
  ];

  it("keeps the periods whose start is the day or earlier, newest first", () => {
    expect(startedOf(periods, "2026-11-05").map((each) => each.id)).toEqual(["current", "older"]);
  });

  it("counts a period starting today, and not one starting tomorrow", () => {
    expect(startedOf(periods, "2026-11-17").map((each) => each.id)).toEqual([
      "next",
      "current",
      "older",
    ]);
    expect(startedOf(periods, "2026-11-16").map((each) => each.id)).toEqual(["current", "older"]);
  });

  it("takes the day in Finnish time, so a period starts at midnight in Finland", () => {
    // 22:30 in UTC on 16 November is 00:30 on 17 November in Finland.
    const day = today(new Date("2026-11-16T22:30:00Z"));
    expect(startedOf(periods, day).map((each) => each.id)).toContain("next");
    expect(startedOf(periods, today(new Date("2026-11-16T21:30:00Z")))).toHaveLength(2);
  });

  it("is empty when no period has started", () => {
    expect(startedOf(periods, "2026-10-19")).toEqual([]);
    expect(startedOf([], "2026-10-19")).toEqual([]);
  });
});

describe("doneCount", () => {
  it("counts sessions done in full or in part, not those not done or unmarked", () => {
    expect(
      doneCount([
        { mark: { status: "done" } },
        { mark: { status: "partly" } },
        { mark: { status: "not_done" } },
        { mark: null },
      ])
    ).toBe(2);
    expect(doneCount([])).toBe(0);
  });
});

describe("countPicks", () => {
  it("counts every pick of every mark once, the same exercise in two picks in both", () => {
    const counts = countPicks([
      { likedBest: "a", likedLeast: "a", easiest: null, hardest: "b" },
      { likedBest: "a", likedLeast: null, easiest: "b", hardest: null },
      NO_PICKS,
    ]);
    expect(Object.fromEntries(counts)).toEqual({
      a: { likedBest: 2, likedLeast: 1, easiest: 0, hardest: 0 },
      b: { likedBest: 0, likedLeast: 0, easiest: 1, hardest: 1 },
    });
  });

  it("is empty with no picks", () => {
    expect(countPicks([NO_PICKS]).size).toBe(0);
    expect(countPicks([]).size).toBe(0);
  });
});

describe("ranked", () => {
  const of = (name: string, likedBest: number, others = 0): ExerciseCounts => ({
    exerciseId: name,
    name,
    counts: { likedBest, likedLeast: others, easiest: 0, hardest: 0 },
  });

  it("puts the exercise liked best most often first", () => {
    expect(
      ranked([of("Kikat", 1), of("Lähdöt", 3), of("Pujottelu", 2)]).map((e) => e.name)
    ).toEqual(["Lähdöt", "Pujottelu", "Kikat"]);
  });

  it("breaks a tie on liked best by all four counts together", () => {
    expect(ranked([of("Kikat", 1), of("Lähdöt", 1, 2)]).map((e) => e.name)).toEqual([
      "Lähdöt",
      "Kikat",
    ]);
    expect(ranked([of("Kikat", 0, 1), of("Lähdöt", 0, 3)]).map((e) => e.name)).toEqual([
      "Lähdöt",
      "Kikat",
    ]);
  });

  it("breaks a tie on every count by name, in Finnish order, whatever the case", () => {
    expect(
      ranked([of("Öljy", 1), of("Ämpäri", 1), of("Åsa", 1), of("Zeta", 1), of("aita", 1)]).map(
        (e) => e.name
      )
    ).toEqual(["aita", "Zeta", "Åsa", "Ämpäri", "Öljy"]);
  });

  it("leaves the list it is given as it was", () => {
    const list = [of("Kikat", 1), of("Lähdöt", 3)];
    ranked(list);
    expect(list.map((e) => e.name)).toEqual(["Kikat", "Lähdöt"]);
  });
});

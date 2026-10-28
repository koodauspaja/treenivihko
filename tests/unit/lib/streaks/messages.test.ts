import { describe, expect, it } from "vitest";
import {
  accomplishmentName,
  bestStreakLine,
  childStreakLines,
  confirmDeletePause,
  currentStreakLine,
  goalLine,
  pausedLine,
  pauseOverlapsWith,
  pauseSpan,
  streakLine,
} from "@/lib/streaks/messages";

const named = (kind: Parameters<typeof accomplishmentName>[0]["kind"], parts = {}) =>
  accomplishmentName({
    kind,
    periodStartsOn: null,
    periodWeeks: null,
    exerciseName: null,
    ...parts,
  });

describe("the streak's messages", () => {
  it("counts the streak in weeks", () => {
    expect(streakLine(0)).toBe("Putki: 0 viikkoa");
    expect(streakLine(1)).toBe("Putki: 1 viikko");
    expect(streakLine(3)).toBe("Putki: 3 viikkoa");
    expect(currentStreakLine(5)).toBe("Putki nyt: 5 viikkoa");
    expect(bestStreakLine(1)).toBe("Paras putki: 1 viikko");
  });

  it("names a pause by its span, or its one day", () => {
    expect(pauseSpan({ startsOn: "2026-11-03", endsOn: "2026-11-09" })).toBe("3.11.–9.11.2026");
    expect(pauseSpan({ startsOn: "2026-12-28", endsOn: "2027-01-03" })).toBe("28.12.2026–3.1.2027");
    expect(pauseSpan({ startsOn: "2026-11-03", endsOn: "2026-11-03" })).toBe("3.11.2026");
    expect(pausedLine("3.11.2026")).toBe("Tauko 3.11.2026: putki ei katkea.");
    expect(confirmDeletePause("3.11.2026")).toBe("Poistetaanko tauko 3.11.2026?");
    expect(pauseOverlapsWith("3.11.2026")).toBe("Tauko menee päällekkäin tauon 3.11.2026 kanssa.");
  });

  it("gives the child's side its lines for each case", () => {
    const lines = (current: number, thisWeekDone: boolean, pause: string | null = null) =>
      childStreakLines({ current, thisWeekDone, pause });
    expect(lines(3, true)).toEqual(["Putki: 3 viikkoa"]);
    expect(lines(3, false)).toEqual([
      "Putki: 3 viikkoa",
      "Tee treeni tällä viikolla, niin putki jatkuu.",
    ]);
    expect(lines(3, false, "3.11.–9.11.2026")).toEqual([
      "Putki: 3 viikkoa",
      "Tauko 3.11.–9.11.2026: putki ei katkea.",
    ]);
    expect(lines(0, false, "3.11.2026")).toEqual(["Tauko 3.11.2026: putki ei katkea."]);
    expect(lines(0, false)).toEqual(["Tee treeni tällä viikolla, niin putki alkaa."]);
  });
});

describe("the accomplishments' names", () => {
  it("names each kind as the spec's table does", () => {
    expect(named("sessions_1")).toBe("Ensimmäinen treeni");
    expect(named("sessions_10")).toBe("10 treeniä");
    expect(named("sessions_100")).toBe("100 treeniä");
    expect(named("streak_4")).toBe("4 viikon putki");
    expect(named("streak_26")).toBe("26 viikon putki");
    expect(named("full_period", { periodStartsOn: "2026-11-03", periodWeeks: 2 })).toBe(
      "Koko jakso tehty 3.11.–16.11.2026"
    );
    expect(named("hard_to_easy", { exerciseName: "Lähdöt" })).toBe("Vaikeasta helpoksi: Lähdöt");
  });

  it("shows a goal with its progress", () => {
    expect(goalLine("10 treeniä", 7, 10)).toBe("10 treeniä (7/10)");
  });
});

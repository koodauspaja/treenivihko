/**
 * The streak's lines on the child's side, for today in Finland, and the
 * sections `Omat treenit` shows.
 *
 * decisions/f008-streaks-and-accomplishments.md
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Achievements } from "@/lib/streaks/store";

const getAchievements = vi.fn();
vi.mock("@/lib/streaks/store", () => ({
  getAchievements: (...args: unknown[]) => getAchievements(...args),
}));

const { AchievementSections, StreakLines } = await import("@/components/streak");

beforeAll(() => {
  // 5 November 2026 in Finland, though 4 November in UTC.
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-04T22:30:00Z") });
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  getAchievements.mockReset();
});

afterEach(() => {
  cleanup();
});

const ACHIEVEMENTS: Achievements = {
  streak: { current: 3, best: 5, thisWeekDone: false },
  pause: null,
  done: 7,
  earned: [],
};

const earned = (id: string, kind: Achievements["earned"][number]["kind"], parts = {}) => ({
  id,
  kind,
  earnedOn: "2026-11-05",
  periodStartsOn: null,
  periodWeeks: null,
  exerciseName: null,
  ...parts,
});

describe("StreakLines", () => {
  it("reads the achievements for today in Finland, and shows the streak with the week's nudge", async () => {
    getAchievements.mockResolvedValue(ACHIEVEMENTS);
    const { container } = render(await StreakLines({ userId: "u1" }));
    expect(getAchievements).toHaveBeenCalledWith("u1", "2026-11-05");
    expect([...container.querySelectorAll("p")].map((each) => each.textContent)).toEqual([
      "Putki: 3 viikkoa",
      "Tee treeni tällä viikolla, niin putki jatkuu.",
    ]);
  });

  it("shows the pause that includes today", async () => {
    getAchievements.mockResolvedValue({
      ...ACHIEVEMENTS,
      streak: { current: 0, best: 0, thisWeekDone: false },
      pause: { id: "pa1", startsOn: "2026-11-03", endsOn: "2026-11-09" },
    });
    const { container } = render(await StreakLines({ userId: "u1" }));
    expect(container.textContent).toBe("Tauko 3.11.–9.11.2026: putki ei katkea.");
  });
});

describe("AchievementSections", () => {
  it("shows the streak and the best, each accomplishment as given with its day, and the next goals", () => {
    render(
      <AchievementSections
        achievements={{
          ...ACHIEVEMENTS,
          earned: [
            earned("a2", "full_period", { periodStartsOn: "2026-10-20", periodWeeks: 2 }),
            earned("a1", "sessions_1", { earnedOn: "2026-10-21" }),
          ],
        }}
      />
    );
    expect(screen.getAllByRole("heading", { level: 2 }).map((each) => each.textContent)).toEqual([
      "Putki",
      "Saavutukset",
      "Seuraavat tavoitteet",
    ]);
    expect(screen.getByText("Putki nyt: 3 viikkoa")).toBeDefined();
    expect(screen.getByText("Paras putki: 5 viikkoa")).toBeDefined();
    expect(screen.getAllByRole("listitem").map((each) => each.textContent)).toEqual([
      "Koko jakso tehty 20.10.–2.11.20265.11.2026",
      "Ensimmäinen treeni21.10.2026",
    ]);
    // The first session is earned, so the next count is 10; no streak length is, so it is 4.
    expect(screen.getByText("10 treeniä (7/10)")).toBeDefined();
    expect(screen.getByText("4 viikon putki (3/4)")).toBeDefined();
  });

  it("says nothing is earned yet, and leaves out the goals once every one is earned", () => {
    render(<AchievementSections achievements={ACHIEVEMENTS} />);
    expect(screen.getByText("Saavutuksia ei ole vielä.")).toBeDefined();
    expect(screen.getByText("Ensimmäinen treeni (7/1)")).toBeDefined();
    cleanup();
    const every = (
      [
        "sessions_1",
        "sessions_10",
        "sessions_25",
        "sessions_50",
        "sessions_100",
        "streak_4",
        "streak_8",
        "streak_12",
        "streak_26",
      ] as const
    ).map((kind) => earned(kind, kind));
    render(<AchievementSections achievements={{ ...ACHIEVEMENTS, earned: every }} />);
    expect(screen.queryByRole("heading", { name: "Seuraavat tavoitteet" })).toBeNull();
  });
});

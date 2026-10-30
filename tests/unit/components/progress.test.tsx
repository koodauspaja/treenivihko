/**
 * The child's progress, for today in Finland: the streak and the
 * accomplishments, the periods that have started with their marks, and the
 * picked exercises with their counts.
 *
 * decisions/f007-progress.md
 * decisions/f008-streaks-and-accomplishments.md
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const getProgress = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireUser: () => requireUser() }));
vi.mock("@/lib/progress/store", () => ({
  getProgress: (...args: unknown[]) => getProgress(...args),
}));
const getAchievements = vi.fn();
vi.mock("@/lib/streaks/store", () => ({
  getAchievements: (...args: unknown[]) => getAchievements(...args),
}));
vi.mock("@/components/streak", () => ({
  AchievementSections: ({ achievements }: { achievements: unknown }) => (
    <p>achievements {JSON.stringify(achievements)}</p>
  ),
}));

const { ProgressView } = await import("@/components/progress");

beforeAll(() => {
  // 5 November 2026 in Finland, though 4 November in UTC.
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-04T22:30:00Z") });
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  requireUser.mockReset().mockResolvedValue({ id: "u1", name: "Test Parent", sessionId: "s1" });
  getProgress.mockReset();
  getAchievements.mockReset().mockResolvedValue({ the: "achievements" });
});

afterEach(() => {
  cleanup();
});

const CURRENT = {
  id: "p2",
  startsOn: "2026-11-03",
  weeks: 2,
  sessions: [
    { id: "t1", position: 1, mark: { status: "done", trainedOn: "2026-11-03", feeling: 5 } },
    { id: "t2", position: 2, mark: { status: "partly", trainedOn: "2026-11-04", feeling: null } },
    { id: "t3", position: 3, mark: { status: "not_done", trainedOn: null, feeling: null } },
    { id: "t4", position: 4, mark: null },
  ],
};
const OLDER = { id: "p1", startsOn: "2026-10-20", weeks: 2, sessions: [] };
const LADDER = {
  exerciseId: "e1",
  name: "Tikkaat: perusaskel",
  counts: { likedBest: 4, likedLeast: 0, easiest: 1, hardest: 2 },
};
const SPRINT = {
  exerciseId: "e2",
  name: "Lähdöt",
  counts: { likedBest: 0, likedLeast: 3, easiest: 0, hardest: 0 },
};

describe("ProgressView", () => {
  it("reads the parent's progress for today in Finland", async () => {
    getProgress.mockResolvedValue({ periods: [], exercises: [] });
    render(await ProgressView());
    expect(getProgress).toHaveBeenCalledWith("u1", "2026-11-05");
    expect(getAchievements).toHaveBeenCalledWith("u1", "2026-11-05");
    expect(screen.getByRole("heading", { level: 1, name: "Omat treenit" })).toBeDefined();
    // The streak and the accomplishments come first, before the periods.
    const text = document.body.textContent ?? "";
    expect(text.indexOf('achievements {"the":"achievements"}')).toBeGreaterThan(
      text.indexOf("Omat treenit")
    );
    expect(text.indexOf("achievements")).toBeLessThan(
      text.indexOf("Jaksoa ei ole vielä aloitettu.")
    );
    expect(screen.getByRole("link", { name: "Takaisin" }).getAttribute("href")).toBe("/");
  });

  it("shows each period as given, its done count, and each session's mark or that it has none", async () => {
    getProgress.mockResolvedValue({ periods: [CURRENT, OLDER], exercises: [] });
    render(await ProgressView());
    expect(screen.getAllByRole("heading", { level: 2 }).map((each) => each.textContent)).toEqual([
      "Jakso 3.11.–16.11.2026",
      "Jakso 20.10.–2.11.2026",
      "Harjoitteet",
    ]);
    const current = screen
      .getByRole("heading", { level: 2, name: "Jakso 3.11.–16.11.2026" })
      .closest("section") as HTMLElement;
    expect(within(current).getByText("Tehty 2/4")).toBeDefined();
    expect(
      within(current)
        .getAllByRole("heading", { level: 3 })
        .map((each) => each.textContent)
    ).toEqual(["Treeni 1", "Treeni 2", "Treeni 3", "Treeni 4"]);
    for (const line of ["Tehty 3.11.2026 😄", "Osittain 4.11.2026", "Ei tehty", "Ei merkitty"]) {
      expect(within(current).getByText(line)).toBeDefined();
    }
  });

  it("says a period has no sessions, with no done count", async () => {
    getProgress.mockResolvedValue({ periods: [OLDER], exercises: [] });
    render(await ProgressView());
    expect(screen.getByText("Jaksossa ei ole vielä treenejä.")).toBeDefined();
    expect(screen.queryByText(/^Tehty /)).toBeNull();
  });

  it("lists each picked exercise as given, with its counts", async () => {
    getProgress.mockResolvedValue({ periods: [CURRENT], exercises: [LADDER, SPRINT] });
    render(await ProgressView());
    const items = screen.getAllByRole("listitem");
    expect(items.map((each) => each.textContent)).toEqual([
      "Tikkaat: perusaskelKivoin 4 · Helpoin 1 · Vaikein 2",
      "LähdötTylsin 3",
    ]);
    expect(screen.queryByText("Harjoitteita ei ole vielä valittu.")).toBeNull();
  });

  it("says when no period has started and no exercise is picked, and offers no way to mark", async () => {
    getProgress.mockResolvedValue({ periods: [], exercises: [] });
    const { container } = render(await ProgressView());
    expect(screen.getByText("Jaksoa ei ole vielä aloitettu.")).toBeDefined();
    expect(screen.getByText("Harjoitteita ei ole vielä valittu.")).toBeDefined();
    expect(container.textContent).not.toContain("Merkitse");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("goes to sign-in without a signed-in user, and reads nothing", async () => {
    requireUser.mockRejectedValue(new Error("redirect /kirjaudu"));
    await expect(ProgressView()).rejects.toThrow("redirect /kirjaudu");
    expect(getProgress).not.toHaveBeenCalled();
    expect(getAchievements).not.toHaveBeenCalled();
  });
});

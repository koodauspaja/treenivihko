/**
 * The child's notebook view: which period it shows, for today in Finland,
 * and what an exercise's page shows.
 *
 * decisions/f005-notebook-view.md
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const getNotebook = vi.fn();
const getNotebookExercise = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("not found");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));
vi.mock("@/lib/auth/session", () => ({ requireUser: () => requireUser() }));
vi.mock("@/lib/periods/store", () => ({
  getNotebook: (...args: unknown[]) => getNotebook(...args),
  getNotebookExercise: (...args: unknown[]) => getNotebookExercise(...args),
}));

const { Notebook, NotebookExerciseView } = await import("@/components/notebook");

beforeAll(() => {
  // 5 November 2026 in Finland, though 4 November in UTC.
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-04T22:30:00Z") });
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  requireUser.mockReset().mockResolvedValue({ id: "u1", name: "Test Parent", sessionId: "s1" });
  getNotebook.mockReset();
  getNotebookExercise.mockReset();
  notFound.mockClear();
});

afterEach(() => {
  cleanup();
});

const PERIOD = { id: "p1", startsOn: "2026-11-03", weeks: 2 };
const SESSIONS = [
  {
    id: "t1",
    position: 1,
    place: "field",
    targetMinutes: 45,
    blocks: [
      {
        id: "b1",
        theme: "Lämmittely",
        exercises: [
          { id: "x1", name: "Tikkaat: perusaskel", amountKind: "count", amount: 10 },
          { id: "x2", name: "Lähdöt", amountKind: "time", amount: 90 },
        ],
      },
      { id: "b2", theme: "Kuljetus", exercises: [] },
    ],
  },
  { id: "t2", position: 2, place: "gym", targetMinutes: 30, blocks: [] },
];

describe("Notebook", () => {
  it("shows the current period's sessions, blocks and exercises in order, for today in Finland", async () => {
    getNotebook.mockResolvedValue({ period: PERIOD, sessions: SESSIONS });
    render(await Notebook({ userId: "u1" }));
    expect(getNotebook).toHaveBeenCalledWith("u1", "2026-11-05");
    expect(screen.getByRole("heading", { level: 2, name: "Jakso 3.11.–16.11.2026" })).toBeDefined();
    expect(screen.queryByText(/^Alkaa/)).toBeNull();
    expect(screen.getAllByRole("heading", { level: 3 }).map((each) => each.textContent)).toEqual([
      "Treeni 1",
      "Treeni 2",
    ]);
    expect(screen.getByText("Kenttä · 45 min")).toBeDefined();
    expect(screen.getByText("Kuntosali · 30 min")).toBeDefined();
    expect(screen.getAllByRole("heading", { level: 4 }).map((each) => each.textContent)).toEqual([
      "Lämmittely",
      "Kuljetus",
    ]);
    expect(screen.getAllByRole("listitem").map((each) => each.textContent)).toEqual([
      "Tikkaat: perusaskel – 10 kertaa",
      "Lähdöt – 1 min 30 s",
    ]);
    expect(screen.getAllByRole("list")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Lähdöt" }).getAttribute("href")).toBe("/harjoite/x2");
  });

  it("says a session with no blocks is still empty", async () => {
    getNotebook.mockResolvedValue({ period: PERIOD, sessions: SESSIONS });
    render(await Notebook({ userId: "u1" }));
    const second = screen.getByRole("heading", { level: 3, name: "Treeni 2" })
      .parentElement as HTMLElement;
    expect(within(second).getByText("Treeni on vielä tyhjä.")).toBeDefined();
    expect(screen.getAllByText("Treeni on vielä tyhjä.")).toHaveLength(1);
  });

  it("says when the next period starts, when it is not the current one", async () => {
    getNotebook.mockResolvedValue({
      period: { id: "p2", startsOn: "2026-11-06", weeks: 1 },
      sessions: [],
    });
    render(await Notebook({ userId: "u1" }));
    expect(screen.getByText("Alkaa 6.11.2026.")).toBeDefined();
    expect(screen.getByText("Jaksossa ei ole vielä treenejä.")).toBeDefined();
  });

  it("says no period has been made yet", async () => {
    getNotebook.mockResolvedValue(null);
    render(await Notebook({ userId: "u1" }));
    expect(screen.getByText("Jaksoa ei ole vielä tehty.")).toBeDefined();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("offers nothing to change", async () => {
    getNotebook.mockResolvedValue({ period: PERIOD, sessions: SESSIONS });
    const { container } = render(await Notebook({ userId: "u1" }));
    expect(container.querySelector("form, button, input, select, textarea")).toBeNull();
  });
});

const EXERCISE = {
  name: "Tikkaat: perusaskel",
  amountKind: "count",
  amount: 12,
  durationMinutes: 5,
  instructions: "Kaksi askelta sisään.\nYksi ulos.",
  videoUrl: "https://example.com/video",
};

const showExercise = async (id = "x1") =>
  render(await NotebookExerciseView({ id: Promise.resolve(id) }));

describe("NotebookExerciseView", () => {
  it("shows the exercise with its amount in the session, duration, instructions and video", async () => {
    getNotebookExercise.mockResolvedValue(EXERCISE);
    const { container } = await showExercise();
    expect(getNotebookExercise).toHaveBeenCalledWith("u1", "x1", "2026-11-05");
    expect(screen.getByRole("heading", { level: 1, name: "Tikkaat: perusaskel" })).toBeDefined();
    expect(screen.getByText("12 kertaa")).toBeDefined();
    expect(screen.getByText("5 min")).toBeDefined();
    expect(screen.getByText(/Kaksi askelta sisään\./).textContent).toBe(
      "Kaksi askelta sisään.\nYksi ulos."
    );
    const video = screen.getByRole("link", { name: "Katso video" });
    expect(video.getAttribute("href")).toBe("https://example.com/video");
    expect(video.getAttribute("target")).toBe("_blank");
    expect(video.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByRole("link", { name: "Takaisin" }).getAttribute("href")).toBe("/");
    expect(container.querySelector("form, button, input")).toBeNull();
  });

  it("shows no video link when there is none", async () => {
    getNotebookExercise.mockResolvedValue({ ...EXERCISE, videoUrl: null });
    await showExercise();
    expect(screen.queryByText("Katso video")).toBeNull();
  });

  it("is not found when the exercise is not in the period shown", async () => {
    getNotebookExercise.mockResolvedValue(null);
    await expect(showExercise("old")).rejects.toThrow("not found");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("shows nothing to a browser that is not signed in", async () => {
    requireUser.mockRejectedValue(new Error("redirect /kirjaudu"));
    await expect(showExercise()).rejects.toThrow("redirect /kirjaudu");
    expect(getNotebookExercise).not.toHaveBeenCalled();
  });
});

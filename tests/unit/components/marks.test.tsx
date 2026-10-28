/**
 * A session's marking page: found only for a session the child may mark
 * today in Finland, with its mark and the way to remove it.
 *
 * decisions/f006-session-marks.md
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const getMarkPage = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("not found");
});
const formProps = vi.fn();
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));
vi.mock("@/lib/auth/session", () => ({ requireUser: () => requireUser() }));
vi.mock("@/lib/marks/store", () => ({
  getMarkPage: (...args: unknown[]) => getMarkPage(...args),
}));
vi.mock("@/app/session/actions", () => ({ removeMark: vi.fn() }));
vi.mock("@/components/mark-form", () => ({
  MarkForm: (props: unknown) => {
    formProps(props);
    return <p>the form</p>;
  },
}));

const { MarkView } = await import("@/components/marks");

beforeAll(() => {
  // 5 November 2026 in Finland, though 4 November in UTC.
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-04T22:30:00Z") });
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  requireUser.mockReset().mockResolvedValue({ id: "u1", name: "Test Parent", sessionId: "s1" });
  getMarkPage.mockReset();
  notFound.mockClear();
  formProps.mockClear();
});

afterEach(() => {
  cleanup();
});

const MARK = {
  status: "done",
  trainedOn: "2026-11-04",
  feeling: 4,
  picks: { likedBest: "e1", likedLeast: null, easiest: null, hardest: null },
};
const PAGE = {
  id: "t1",
  position: 2,
  period: { id: "p1", startsOn: "2026-11-03", weeks: 2 },
  exercises: [{ exerciseId: "e1", name: "Lähdöt" }],
  mark: null,
};

const show = async (id = "t1") => render(await MarkView({ id: Promise.resolve(id) }));

describe("MarkView", () => {
  it("shows the session, its period and the form, for today in Finland", async () => {
    getMarkPage.mockResolvedValue(PAGE);
    await show();
    expect(getMarkPage).toHaveBeenCalledWith("u1", "t1", "2026-11-05");
    expect(screen.getByRole("heading", { level: 1, name: "Treeni 2" })).toBeDefined();
    expect(screen.getByText("Jakso 3.11.–16.11.2026")).toBeDefined();
    expect(formProps).toHaveBeenCalledWith({
      sessionId: "t1",
      today: "2026-11-05",
      exercises: PAGE.exercises,
      mark: null,
    });
    expect(screen.queryByRole("button", { name: "Poista merkintä" })).toBeNull();
    expect(screen.getByRole("link", { name: "Takaisin" }).getAttribute("href")).toBe("/");
  });

  it("offers to remove a saved mark", async () => {
    getMarkPage.mockResolvedValue({ ...PAGE, mark: MARK });
    await show();
    expect(formProps).toHaveBeenCalledWith(expect.objectContaining({ mark: MARK }));
    expect(screen.getByRole("button", { name: "Poista merkintä" })).toBeDefined();
  });

  it("is not found for a session the child may not mark", async () => {
    getMarkPage.mockResolvedValue(null);
    await expect(show("old")).rejects.toThrow("not found");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("shows nothing to a browser that is not signed in", async () => {
    requireUser.mockRejectedValue(new Error("redirect /kirjaudu"));
    await expect(show()).rejects.toThrow("redirect /kirjaudu");
    expect(getMarkPage).not.toHaveBeenCalled();
  });
});

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const requireTrainer = vi.fn();
const listPeriods = vi.fn();
const listPeriodDates = vi.fn();
const getPeriod = vi.fn();
const getPeriodMarks = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("not found");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));
vi.mock("@/lib/trainer/access", () => ({ requireTrainer: () => requireTrainer() }));
vi.mock("@/lib/periods/store", () => ({
  listPeriods: (...args: unknown[]) => listPeriods(...args),
  listPeriodDates: (...args: unknown[]) => listPeriodDates(...args),
  getPeriod: (...args: unknown[]) => getPeriod(...args),
}));
vi.mock("@/lib/progress/store", () => ({
  getPeriodMarks: (...args: unknown[]) => getPeriodMarks(...args),
}));
vi.mock("@/app/trainer/periods/actions", () => ({
  addSessionFromForm: vi.fn(),
  removePeriod: vi.fn(),
}));
vi.mock("@/components/trainer-timeout", () => ({
  TrainerTimeout: ({ expiresAt }: { expiresAt: string }) => <p>timeout {expiresAt}</p>,
}));
vi.mock("@/components/period-form", () => ({
  PeriodForm: ({
    periodId,
    initial,
  }: {
    periodId?: string;
    initial: { startsOn: string; weeks: string };
  }) => (
    <p>
      form {String(periodId)} {initial.startsOn} {initial.weeks}
    </p>
  ),
}));
vi.mock("@/components/action-button", () => ({
  ActionButton: ({ fields, label }: { fields: Record<string, string>; label: string }) => (
    <p>
      button {label} {JSON.stringify(fields)}
    </p>
  ),
}));
vi.mock("@/components/confirm-action", () => ({
  ConfirmAction: ({
    fields,
    label,
    question,
  }: {
    fields: Record<string, string>;
    label: string;
    question: string;
  }) => (
    <p>
      confirm {label} {question} {JSON.stringify(fields)}
    </p>
  ),
}));

const { NewPeriod, PeriodList, PeriodView } = await import("@/components/period-views");

const END = new Date("2026-11-05T12:15:00.000Z");

beforeAll(() => {
  // 5 November 2026 in Finland, whose day the pages use. decisions/f004-periods-and-sessions.md
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-05T10:00:00Z") });
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  requireTrainer.mockReset().mockResolvedValue({
    user: { id: "u1", name: "Test Parent", sessionId: "s1" },
    expiresAt: END,
  });
  for (const mock of [listPeriods, listPeriodDates, getPeriod]) {
    mock.mockReset();
  }
  getPeriodMarks.mockReset().mockResolvedValue({});
  notFound.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("PeriodList", () => {
  it("says there are no periods yet", async () => {
    listPeriods.mockResolvedValue([]);
    render(await PeriodList());
    expect(listPeriods).toHaveBeenCalledWith("u1");
    expect(screen.getByText("Jaksoja ei ole vielä.")).toBeDefined();
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByText(`timeout ${END.toISOString()}`)).toBeDefined();
  });

  it("lists the periods as given, each a link with its sessions, the current one marked", async () => {
    listPeriods.mockResolvedValue([
      { id: "p3", startsOn: "2026-11-17", weeks: 1, sessionCount: 0 },
      { id: "p2", startsOn: "2026-11-03", weeks: 2, sessionCount: 1 },
      { id: "p1", startsOn: "2026-10-20", weeks: 2, sessionCount: 3 },
    ]);
    render(await PeriodList());
    const rows = screen.getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      "17.11.–23.11.2026ei treenejä",
      "3.11.–16.11.2026 Nyt menossa1 treeni",
      "20.10.–2.11.20263 treeniä",
    ]);
    expect(
      within(rows[1] as HTMLElement)
        .getByRole("link")
        .getAttribute("href")
    ).toBe("/valmentaja/jaksot/p2");
  });

  it("shows nothing without an unlock", async () => {
    requireTrainer.mockRejectedValue(new Error("redirect /valmentaja/avaa"));
    await expect(PeriodList()).rejects.toThrow("redirect");
    expect(listPeriods).not.toHaveBeenCalled();
  });
});

describe("NewPeriod", () => {
  it("starts empty from today for 2 weeks when there is no period", async () => {
    listPeriodDates.mockResolvedValue([]);
    render(await NewPeriod());
    expect(listPeriodDates).toHaveBeenCalledWith("u1");
    expect(screen.getByText("Uusi jakso alkaa tyhjänä.")).toBeDefined();
    expect(screen.getByText("form undefined 2026-11-05 2")).toBeDefined();
  });

  it("copies the period that ends last, starting the day after it with its length", async () => {
    listPeriodDates.mockResolvedValue([
      { id: "p2", startsOn: "2026-12-21", weeks: 3 },
      { id: "p1", startsOn: "2026-11-03", weeks: 2 },
    ]);
    render(await NewPeriod());
    expect(
      screen.getByText("Uusi jakso alkaa kopiona jaksosta 21.12.2026–10.1.2027.")
    ).toBeDefined();
    expect(screen.getByText("form undefined 2027-01-11 3")).toBeDefined();
  });

  it("shows nothing without an unlock", async () => {
    requireTrainer.mockRejectedValue(new Error("redirect /valmentaja/avaa"));
    await expect(NewPeriod()).rejects.toThrow("redirect");
    expect(listPeriodDates).not.toHaveBeenCalled();
  });
});

describe("PeriodView", () => {
  const PERIOD = { id: "p1", startsOn: "2026-11-03", weeks: 2 };

  it("shows the current period, its dates, its sessions, and the buttons", async () => {
    getPeriod.mockResolvedValue({
      ...PERIOD,
      sessions: [
        { id: "t1", position: 1, place: "field", targetMinutes: 45, totalMinutes: 40 },
        { id: "t2", position: 2, place: "gym", targetMinutes: 30, totalMinutes: 35 },
      ],
    });
    render(await PeriodView({ id: Promise.resolve("p1") }));
    expect(getPeriod).toHaveBeenCalledWith("u1", "p1");
    expect(screen.getByRole("heading", { level: 1, name: "Jakso 3.11.–16.11.2026" })).toBeDefined();
    expect(screen.getByText("Nyt menossa")).toBeDefined();
    expect(screen.getByText("form p1 2026-11-03 2")).toBeDefined();
    expect(screen.getByRole("link", { name: "Treeni 1" }).getAttribute("href")).toBe(
      "/valmentaja/treenit/t1"
    );
    expect(screen.getByText("Kenttä, 40 / 45 min")).toBeDefined();
    expect(screen.getByText("Kuntosali, 35 / 30 min")).toBeDefined();
    expect(screen.getByText('button Lisää treeni {"periodId":"p1"}')).toBeDefined();
    expect(
      screen.getByText(
        'confirm Poista jakso Poistetaanko jakso 3.11.–16.11.2026 ja sen treenit? {"id":"p1"}'
      )
    ).toBeDefined();
    expect(screen.getByText(`timeout ${END.toISOString()}`)).toBeDefined();
  });

  it("shows a marked session's line and its set picks by name, and nothing more for one not marked", async () => {
    getPeriod.mockResolvedValue({
      ...PERIOD,
      sessions: [
        { id: "t1", position: 1, place: "field", targetMinutes: 45, totalMinutes: 40 },
        { id: "t2", position: 2, place: "gym", targetMinutes: 30, totalMinutes: 35 },
      ],
    });
    getPeriodMarks.mockResolvedValue({
      t1: {
        status: "done",
        trainedOn: "2026-11-04",
        feeling: 5,
        picks: { likedBest: "Lähdöt", likedLeast: null, easiest: "Kikat", hardest: "Lähdöt" },
      },
    });
    render(await PeriodView({ id: Promise.resolve("p1") }));
    expect(getPeriodMarks).toHaveBeenCalledWith("u1", "p1");
    const [first, second] = screen.getAllByRole("listitem");
    expect(
      within(first as HTMLElement)
        .getAllByText(/./, { selector: "p" })
        .map((each) => each.textContent)
    ).toEqual([
      "Kenttä, 40 / 45 min",
      "Tehty 4.11.2026 😄",
      "Kivoin: Lähdöt",
      "Helpoin: Kikat",
      "Vaikein: Lähdöt",
    ]);
    expect(
      within(second as HTMLElement)
        .getAllByText(/./, { selector: "p" })
        .map((each) => each.textContent)
    ).toEqual(["Kuntosali, 35 / 30 min"]);
  });

  it("says a period has no sessions, and marks no other period current", async () => {
    getPeriod.mockResolvedValue({ ...PERIOD, startsOn: "2026-11-17", sessions: [] });
    render(await PeriodView({ id: Promise.resolve("p1") }));
    expect(screen.getByText("Jaksossa ei ole vielä treenejä.")).toBeDefined();
    expect(screen.queryByText("Nyt menossa")).toBeNull();
  });

  it("is not found when the period is not the parent's", async () => {
    getPeriod.mockResolvedValue(null);
    await expect(PeriodView({ id: Promise.resolve("other") })).rejects.toThrow("not found");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("shows nothing without an unlock", async () => {
    requireTrainer.mockRejectedValue(new Error("redirect /valmentaja/avaa"));
    await expect(PeriodView({ id: Promise.resolve("p1") })).rejects.toThrow("redirect");
    expect(getPeriod).not.toHaveBeenCalled();
    expect(getPeriodMarks).not.toHaveBeenCalled();
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const USER = { id: "u1", name: "Test Parent", sessionId: "s1" };
const requireUser = vi.fn();
const saveMark = vi.fn();
const deleteMark = vi.fn();
const refresh = vi.fn();
const redirect = vi.fn((path: string) => {
  throw new Error(`redirect ${path}`);
});

vi.mock("next/cache", () => ({ refresh: () => refresh() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));
vi.mock("@/lib/auth/session", () => ({ requireUser: () => requireUser() }));
vi.mock("@/lib/marks/store", () => ({
  saveMark: (...args: unknown[]) => saveMark(...args),
  deleteMark: (...args: unknown[]) => deleteMark(...args),
}));

const { removeMark, saveMarkFromForm } = await import("@/app/session/actions");

const START = { version: 3, message: null, errors: {} };
const HOME = new Error("redirect /");

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    data.append(name, value);
  }
  return data;
};

const VALID = {
  id: "t1",
  status: "done",
  trainedOn: "2026-11-04",
  feeling: "4",
  likedBest: "e1",
  likedLeast: "",
  easiest: "e1",
  hardest: "e2",
};

beforeAll(() => {
  // 5 November 2026 in Finland, though 4 November in UTC.
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-04T22:30:00Z") });
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  for (const mock of [requireUser, saveMark, deleteMark]) {
    mock.mockReset();
  }
  refresh.mockClear();
  redirect.mockClear();
  requireUser.mockResolvedValue(USER);
});

describe("saveMarkFromForm", () => {
  it("saves the mark for today in Finland, then shows the child's side", async () => {
    saveMark.mockResolvedValue({ kind: "saved" });
    await expect(saveMarkFromForm(START, form(VALID))).rejects.toEqual(HOME);
    expect(saveMark).toHaveBeenCalledWith(
      "u1",
      "t1",
      {
        status: "done",
        trainedOn: "2026-11-04",
        feeling: 4,
        picks: { likedBest: "e1", likedLeast: null, easiest: "e1", hardest: "e2" },
      },
      "2026-11-05"
    );
  });

  it("shows a field's refusal, and saves nothing", async () => {
    expect(await saveMarkFromForm(START, form({ ...VALID, status: "" }))).toEqual({
      version: 4,
      message: null,
      errors: { status: "Valitse, teitkö treenin." },
    });
    expect(await saveMarkFromForm(START, form({ ...VALID, trainedOn: "2026-11-06" }))).toEqual({
      version: 4,
      message: null,
      errors: { trainedOn: "Valitse päivä jakson alusta tähän päivään." },
    });
    expect(saveMark).not.toHaveBeenCalled();
  });

  it("refuses a day before the period's start", async () => {
    saveMark.mockResolvedValue({ kind: "early" });
    expect(await saveMarkFromForm(START, form(VALID))).toEqual({
      version: 4,
      message: null,
      errors: { trainedOn: "Valitse päivä jakson alusta tähän päivään." },
    });
  });

  it("refuses a pick that has left the session, and refreshes to show its exercises now", async () => {
    saveMark.mockResolvedValue({ kind: "stale" });
    expect(await saveMarkFromForm(START, form(VALID))).toEqual({
      version: 4,
      message: null,
      errors: { picks: "Treeni on muuttunut. Valitse uudelleen." },
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("says a session that cannot be marked is not found", async () => {
    saveMark.mockResolvedValue({ kind: "missing" });
    expect(await saveMarkFromForm(START, form(VALID))).toEqual({
      version: 4,
      message: "Sivua ei löytynyt.",
      errors: {},
    });
  });

  it("goes to sign-in without a signed-in user, and saves nothing", async () => {
    requireUser.mockRejectedValue(new Error("redirect /kirjaudu"));
    await expect(saveMarkFromForm(START, form(VALID))).rejects.toThrow("redirect /kirjaudu");
    expect(saveMark).not.toHaveBeenCalled();
  });
});

describe("removeMark", () => {
  it("removes the mark for today in Finland, then shows the child's side", async () => {
    deleteMark.mockResolvedValue("deleted");
    await expect(removeMark({ version: 1, error: null }, form({ id: "t1" }))).rejects.toEqual(HOME);
    expect(deleteMark).toHaveBeenCalledWith("u1", "t1", "2026-11-05");
  });

  it("shows the child's side when the mark was already gone", async () => {
    deleteMark.mockResolvedValue("absent");
    await expect(removeMark({ version: 1, error: null }, form({ id: "t1" }))).rejects.toEqual(HOME);
  });

  it("says a session that cannot be marked is not found", async () => {
    deleteMark.mockResolvedValue("missing");
    expect(await removeMark({ version: 1, error: null }, form({ id: "t1" }))).toEqual({
      version: 2,
      error: "Sivua ei löytynyt.",
    });
  });
});

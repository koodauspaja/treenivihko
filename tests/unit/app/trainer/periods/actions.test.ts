import { beforeEach, describe, expect, it, vi } from "vitest";

const USER = { id: "u1", name: "Test Parent", sessionId: "s1" };
const requireTrainer = vi.fn();
const createPeriod = vi.fn();
const createAdaptedPeriod = vi.fn();
const updatePeriodDates = vi.fn();
const deletePeriod = vi.fn();
const addSession = vi.fn();
const refresh = vi.fn();
const redirect = vi.fn((path: string) => {
  throw new Error(`redirect ${path}`);
});

vi.mock("next/cache", () => ({ refresh: () => refresh() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));
vi.mock("@/lib/trainer/access", () => ({ requireTrainer: () => requireTrainer() }));
vi.mock("@/lib/periods/store", () => ({
  createPeriod: (...args: unknown[]) => createPeriod(...args),
  createAdaptedPeriod: (...args: unknown[]) => createAdaptedPeriod(...args),
  updatePeriodDates: (...args: unknown[]) => updatePeriodDates(...args),
  deletePeriod: (...args: unknown[]) => deletePeriod(...args),
  addSession: (...args: unknown[]) => addSession(...args),
}));

const { addSessionFromForm, createPeriodFromForm, removePeriod, savePeriodDates } = await import(
  "@/app/trainer/periods/actions"
);

const START = {
  version: 3,
  message: null,
  errors: {},
  values: { startsOn: "2026-11-03", weeks: "2" },
};
const ASKED = { version: 3, error: null };

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    data.append(name, value);
  }
  return data;
};

const OVERLAP = { kind: "overlap", with: { id: "p0", startsOn: "2026-11-03", weeks: 2 } };
const UNLOCK = new Error("redirect /valmentaja/avaa");

beforeEach(() => {
  for (const mock of [
    requireTrainer,
    createPeriod,
    createAdaptedPeriod,
    updatePeriodDates,
    deletePeriod,
    addSession,
  ]) {
    mock.mockReset();
  }
  refresh.mockClear();
  redirect.mockClear();
  requireTrainer.mockResolvedValue({ user: USER, expiresAt: new Date() });
});

describe("createPeriodFromForm", () => {
  it("creates the period and shows it", async () => {
    createPeriod.mockResolvedValue({ kind: "saved", id: "p1" });
    await expect(
      createPeriodFromForm(START, form({ startsOn: "2026-11-17", weeks: "3" }))
    ).rejects.toThrow("redirect /valmentaja/jaksot/p1");
    expect(createPeriod).toHaveBeenCalledWith("u1", { startsOn: "2026-11-17", weeks: 3 });
  });

  it("creates an adapted copy when the choice is checked, and shows what changed in place of the form", async () => {
    createAdaptedPeriod.mockResolvedValue({
      kind: "saved",
      id: "p2",
      changes: [
        {
          kind: "amount",
          id: "b1",
          session: 1,
          name: "Kuljetus",
          amountKind: "count",
          from: 10,
          to: 12,
        },
        {
          kind: "swap",
          id: "b2",
          session: 2,
          from: "Harhautus",
          to: "Syöttö",
          amountKind: "count",
          amount: 8,
        },
      ],
    });
    const state = await createPeriodFromForm(
      START,
      form({ startsOn: "2026-11-17", weeks: "2", adapt: "on" })
    );
    expect(createAdaptedPeriod).toHaveBeenCalledWith("u1", { startsOn: "2026-11-17", weeks: 2 });
    expect(createPeriod).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    expect(state).toEqual({
      version: 4,
      message: null,
      errors: {},
      values: { startsOn: "2026-11-17", weeks: "2" },
      created: {
        id: "p2",
        span: "17.11.–30.11.2026",
        changes: [
          { id: "b1", line: "Treeni 1: Kuljetus 10 kertaa → 12 kertaa" },
          { id: "b2", line: "Treeni 2: Harhautus vaihtui harjoitteeseen Syöttö (8 kertaa)" },
        ],
      },
    });
  });

  it("refuses an adapted copy's overlap as the plain copy's", async () => {
    createAdaptedPeriod.mockResolvedValue(OVERLAP);
    const state = await createPeriodFromForm(
      START,
      form({ startsOn: "2026-11-10", weeks: "2", adapt: "on" })
    );
    expect(state.errors).toEqual({
      startsOn: "Jakso menee päällekkäin jakson 3.11.–16.11.2026 kanssa.",
    });
    expect(state.created).toBeUndefined();
  });

  it("refuses a wrong field, keeps what was typed, and creates nothing", async () => {
    const state = await createPeriodFromForm(START, form({ startsOn: "", weeks: "5" }));
    expect(state).toEqual({
      version: 4,
      message: null,
      errors: { startsOn: "Anna alkamispäivä.", weeks: "Valitse kesto." },
      values: { startsOn: "", weeks: "5" },
    });
    expect(createPeriod).not.toHaveBeenCalled();
  });

  it("refuses an overlap, naming the period, beside the start", async () => {
    createPeriod.mockResolvedValue(OVERLAP);
    const state = await createPeriodFromForm(START, form({ startsOn: "2026-11-10", weeks: "2" }));
    expect(state).toEqual({
      version: 4,
      message: null,
      errors: { startsOn: "Jakso menee päällekkäin jakson 3.11.–16.11.2026 kanssa." },
      values: { startsOn: "2026-11-10", weeks: "2" },
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("reads a field sent as a file as empty", async () => {
    const data = form({ weeks: "2" });
    data.append("startsOn", new Blob(["2026-11-03"]));
    const state = await createPeriodFromForm(START, data);
    expect(state.errors).toEqual({ startsOn: "Anna alkamispäivä." });
  });

  it("needs an unlock, and creates nothing without one", async () => {
    requireTrainer.mockRejectedValue(UNLOCK);
    await expect(
      createPeriodFromForm(START, form({ startsOn: "2026-11-17", weeks: "2" }))
    ).rejects.toThrow(UNLOCK.message);
    expect(createPeriod).not.toHaveBeenCalled();
  });
});

describe("savePeriodDates", () => {
  it("saves the dates, says so, and refreshes the page", async () => {
    updatePeriodDates.mockResolvedValue({ kind: "saved", id: "p1" });
    const state = await savePeriodDates(
      START,
      form({ id: "p1", startsOn: "2026-11-10", weeks: "1" })
    );
    expect(updatePeriodDates).toHaveBeenCalledWith("u1", "p1", {
      startsOn: "2026-11-10",
      weeks: 1,
    });
    expect(state).toEqual({
      version: 4,
      message: "Tallennettu.",
      errors: {},
      values: { startsOn: "2026-11-10", weeks: "1" },
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("refuses a wrong field and saves nothing", async () => {
    const state = await savePeriodDates(START, form({ id: "p1", startsOn: "x", weeks: "2" }));
    expect(state.errors).toEqual({ startsOn: "Anna alkamispäivä." });
    expect(updatePeriodDates).not.toHaveBeenCalled();
  });

  it("refuses an overlap, naming the period", async () => {
    updatePeriodDates.mockResolvedValue(OVERLAP);
    const state = await savePeriodDates(
      START,
      form({ id: "p1", startsOn: "2026-11-10", weeks: "2" })
    );
    expect(state.errors).toEqual({
      startsOn: "Jakso menee päällekkäin jakson 3.11.–16.11.2026 kanssa.",
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("says a period deleted meanwhile is not found", async () => {
    updatePeriodDates.mockResolvedValue({ kind: "missing" });
    const state = await savePeriodDates(
      START,
      form({ id: "gone", startsOn: "2026-11-10", weeks: "2" })
    );
    expect(state).toMatchObject({ message: null, errors: { startsOn: "Sivua ei löytynyt." } });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("needs an unlock", async () => {
    requireTrainer.mockRejectedValue(UNLOCK);
    await expect(
      savePeriodDates(START, form({ id: "p1", startsOn: "2026-11-10", weeks: "2" }))
    ).rejects.toThrow(UNLOCK.message);
    expect(updatePeriodDates).not.toHaveBeenCalled();
  });
});

describe("removePeriod", () => {
  it("deletes the parent's period and shows the periods", async () => {
    await expect(removePeriod(ASKED, form({ id: "p1" }))).rejects.toThrow(
      "redirect /valmentaja/jaksot"
    );
    expect(deletePeriod).toHaveBeenCalledWith("u1", "p1");
  });

  it("needs an unlock", async () => {
    requireTrainer.mockRejectedValue(UNLOCK);
    await expect(removePeriod(ASKED, form({ id: "p1" }))).rejects.toThrow(UNLOCK.message);
    expect(deletePeriod).not.toHaveBeenCalled();
  });
});

describe("addSessionFromForm", () => {
  it("adds a session and shows it", async () => {
    addSession.mockResolvedValue({ kind: "saved", id: "t1" });
    await expect(addSessionFromForm(ASKED, form({ periodId: "p1" }))).rejects.toThrow(
      "redirect /valmentaja/treenit/t1"
    );
    expect(addSession).toHaveBeenCalledWith("u1", "p1");
  });

  it("refuses a 21st session", async () => {
    addSession.mockResolvedValue({ kind: "limit" });
    expect(await addSessionFromForm(ASKED, form({ periodId: "p1" }))).toEqual({
      version: 4,
      error: "Jaksossa voi olla enintään 20 treeniä.",
    });
  });

  it("says a period deleted meanwhile is not found", async () => {
    addSession.mockResolvedValue({ kind: "missing" });
    expect(await addSessionFromForm(ASKED, form({ periodId: "gone" }))).toEqual({
      version: 4,
      error: "Sivua ei löytynyt.",
    });
  });

  it("needs an unlock", async () => {
    requireTrainer.mockRejectedValue(UNLOCK);
    await expect(addSessionFromForm(ASKED, form({ periodId: "p1" }))).rejects.toThrow(
      UNLOCK.message
    );
    expect(addSession).not.toHaveBeenCalled();
  });
});

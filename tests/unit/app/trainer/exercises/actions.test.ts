import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_VALUES } from "@/lib/exercises/rules";

const USER = { id: "u1", name: "Test Parent", sessionId: "s1" };
const requireTrainer = vi.fn();
const createExercise = vi.fn();
const updateExercise = vi.fn();
const deleteExercise = vi.fn();
const refresh = vi.fn();
const redirect = vi.fn((path: string) => {
  throw new Error(`redirect ${path}`);
});

vi.mock("next/cache", () => ({ refresh: () => refresh() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));
vi.mock("@/lib/trainer/access", () => ({ requireTrainer: () => requireTrainer() }));
vi.mock("@/lib/exercises/store", () => ({
  createExercise: (...args: unknown[]) => createExercise(...args),
  updateExercise: (...args: unknown[]) => updateExercise(...args),
  deleteExercise: (...args: unknown[]) => deleteExercise(...args),
}));

const { removeExercise, saveExercise } = await import("@/app/trainer/exercises/actions");

const START = { version: 3, message: null, errors: {}, values: EMPTY_VALUES };

const form = (fields: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const each of [value].flat()) {
      data.append(name, each);
    }
  }
  return data;
};

const VALID = {
  name: "Tikkaat",
  instructions: "Tee näin.",
  amountKind: "count",
  count: "10",
  durationMinutes: "5",
  level: "1",
  label: ["footwork", "field"],
};

beforeEach(() => {
  for (const mock of [requireTrainer, createExercise, updateExercise, deleteExercise]) {
    mock.mockReset();
  }
  refresh.mockClear();
  redirect.mockClear();
  requireTrainer.mockResolvedValue({ user: USER, expiresAt: new Date() });
});

describe("saveExercise", () => {
  it("adds a new exercise, and starts the form again empty", async () => {
    createExercise.mockResolvedValue({ kind: "saved", id: "e1" });
    const state = await saveExercise(START, form(VALID));
    expect(createExercise).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ name: "Tikkaat", amount: 10 })
    );
    expect(state).toEqual({
      version: 4,
      message: "Lisätty: Tikkaat.",
      errors: {},
      values: EMPTY_VALUES,
    });
    expect(updateExercise).not.toHaveBeenCalled();
  });

  it("saves an existing exercise, keeps its values, and refreshes the page", async () => {
    updateExercise.mockResolvedValue({ kind: "saved", id: "e1" });
    const state = await saveExercise(START, form({ ...VALID, id: "e1", revision: "4" }));
    expect(updateExercise).toHaveBeenCalledWith(
      "u1",
      "e1",
      expect.objectContaining({ name: "Tikkaat" }),
      { revision: 4, over: false }
    );
    expect(state).toMatchObject({ version: 4, message: "Tallennettu.", errors: {} });
    expect(state.values.name).toBe("Tikkaat");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("shows a saved exercise as it was saved, not as it was typed", async () => {
    updateExercise.mockResolvedValue({ kind: "saved", id: "e1" });
    const state = await saveExercise(
      START,
      form({ ...VALID, id: "e1", name: "  Tikkaat ", instructions: "Tee\r\nnäin. ", count: " 10" })
    );
    expect(state.values).toMatchObject({
      name: "Tikkaat",
      instructions: "Tee\nnäin.",
      count: "10",
    });
  });

  it("refuses a wrong field, keeps what was typed, and saves nothing", async () => {
    const state = await saveExercise(START, form({ ...VALID, name: "" }));
    expect(state).toMatchObject({
      version: 4,
      message: null,
      errors: { name: "Nimessä on oltava 1–40 merkkiä." },
    });
    expect(state.values.instructions).toBe("Tee näin.");
    expect(createExercise).not.toHaveBeenCalled();
  });

  it("refuses a name already in the library", async () => {
    createExercise.mockResolvedValue({ kind: "nameInUse" });
    const state = await saveExercise(START, form(VALID));
    expect(state.errors).toEqual({ name: "Samanniminen harjoite on jo kirjastossa." });
    expect(state.values.name).toBe("Tikkaat");
  });

  it("refuses a wrong field of an existing exercise before its revision is checked", async () => {
    const state = await saveExercise(START, form({ ...VALID, id: "e1", revision: "1", name: "" }));
    expect(state.errors).toEqual({ name: "Nimessä on oltava 1–40 merkkiä." });
    expect(state.changed).toBeUndefined();
    expect(updateExercise).not.toHaveBeenCalled();
  });

  it("refuses renaming an exercise to a name already in the library", async () => {
    updateExercise.mockResolvedValue({ kind: "nameInUse" });
    const state = await saveExercise(START, form({ ...VALID, id: "e1", revision: "2" }));
    expect(state.errors).toEqual({ name: "Samanniminen harjoite on jo kirjastossa." });
    expect(state.changed).toBeUndefined();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("says an exercise deleted meanwhile is not found", async () => {
    updateExercise.mockResolvedValue({ kind: "missing" });
    const state = await saveExercise(START, form({ ...VALID, id: "gone" }));
    expect(state.message).toBe("Sivua ei löytynyt.");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refuses a save of an exercise changed meanwhile, keeps what was typed, and offers its revision", async () => {
    updateExercise.mockResolvedValue({ kind: "changed", revision: 5 });
    const state = await saveExercise(
      START,
      form({ ...VALID, id: "e1", revision: "4", name: "Uusi" })
    );
    expect(state).toMatchObject({
      version: 4,
      message:
        "Harjoitetta on muutettu muualla sen jälkeen, kun avasit sen. Tallennus ei korvannut muutosta.",
      errors: {},
      changed: { revision: 5 },
    });
    expect(state.values.name).toBe("Uusi");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("saves over a change with Tallenna silti, from the revision the refusal found", async () => {
    updateExercise.mockResolvedValue({ kind: "saved", id: "e1" });
    const state = await saveExercise(START, form({ ...VALID, id: "e1", revision: "4", over: "5" }));
    expect(updateExercise).toHaveBeenCalledWith("u1", "e1", expect.anything(), {
      revision: 5,
      over: true,
    });
    expect(state.message).toBe("Tallennettu.");
    expect(state.changed).toBeUndefined();
  });

  it.each([
    ["no revision", {}],
    ["an empty one", { revision: "" }],
    ["zero", { revision: "0" }],
    ["one with a sign", { revision: "+4" }],
    ["a decimal", { revision: "4.0" }],
    ["one past Postgres's integers", { revision: "2147483648" }],
    ["ten digits", { revision: "1000000000" }],
  ])("sends %s as revision 0, which no exercise is at", async (_, fields) => {
    updateExercise.mockResolvedValue({ kind: "changed", revision: 1 });
    await saveExercise(START, form({ ...VALID, id: "e1", ...fields }));
    expect(updateExercise).toHaveBeenCalledWith("u1", "e1", expect.anything(), {
      revision: 0,
      over: false,
    });
  });

  it("takes the largest revision it reads, nine digits", async () => {
    updateExercise.mockResolvedValue({ kind: "saved", id: "e1" });
    await saveExercise(START, form({ ...VALID, id: "e1", revision: "999999999" }));
    expect(updateExercise).toHaveBeenCalledWith("u1", "e1", expect.anything(), {
      revision: 999999999,
      over: false,
    });
  });

  it("needs an unlock, and saves nothing without one", async () => {
    requireTrainer.mockRejectedValue(new Error("redirect /valmentaja/avaa"));
    await expect(saveExercise(START, form(VALID))).rejects.toThrow("redirect /valmentaja/avaa");
    expect(createExercise).not.toHaveBeenCalled();
  });
});

describe("removeExercise", () => {
  const ASKED = { version: 2, error: null };

  it("deletes the parent's exercise and shows the library", async () => {
    deleteExercise.mockResolvedValue({ kind: "deleted" });
    await expect(removeExercise(ASKED, form({ id: "e1" }))).rejects.toThrow(
      "redirect /valmentaja/harjoitteet"
    );
    expect(deleteExercise).toHaveBeenCalledWith("u1", "e1");
  });

  it("shows the library when the exercise is already gone", async () => {
    deleteExercise.mockResolvedValue({ kind: "missing" });
    await expect(removeExercise(ASKED, new FormData())).rejects.toThrow(
      "redirect /valmentaja/harjoitteet"
    );
    expect(deleteExercise).toHaveBeenCalledWith("u1", "");
  });

  it("refuses an exercise a period uses, naming the periods, and stays on its page", async () => {
    deleteExercise.mockResolvedValue({
      kind: "inUse",
      periods: [
        { startsOn: "2026-11-03", weeks: 2 },
        { startsOn: "2026-12-29", weeks: 2 },
      ],
    });
    expect(await removeExercise(ASKED, form({ id: "e1" }))).toEqual({
      version: 3,
      error:
        "Harjoite on käytössä jaksoissa: 3.11.–16.11.2026, 29.12.2026–11.1.2027. Poista se ensin niiden treeneistä.",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("needs an unlock", async () => {
    requireTrainer.mockRejectedValue(new Error("redirect /valmentaja/avaa"));
    await expect(removeExercise(ASKED, form({ id: "e1" }))).rejects.toThrow(
      "redirect /valmentaja/avaa"
    );
    expect(deleteExercise).not.toHaveBeenCalled();
  });
});

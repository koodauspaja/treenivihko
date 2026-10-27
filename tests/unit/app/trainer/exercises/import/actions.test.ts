import { beforeEach, describe, expect, it, vi } from "vitest";

const USER = { id: "u1", name: "Test Parent", sessionId: "s1" };
const requireTrainer = vi.fn();
const listExercises = vi.fn();
const importExercises = vi.fn();
const toStderr = vi.fn();

vi.mock("@/lib/trainer/access", () => ({ requireTrainer: () => requireTrainer() }));
vi.mock("@/lib/auth/allowlist", () => ({ toStderr: (line: string) => toStderr(line) }));
vi.mock("@/lib/exercises/store", () => ({
  listExercises: (...args: unknown[]) => listExercises(...args),
  importExercises: (...args: unknown[]) => importExercises(...args),
}));

const { importFromForm } = await import("@/app/trainer/exercises/import/actions");

const START = { version: 3, message: null, refusal: null, failing: [], text: "" };

const EXERCISE = {
  nimi: "Tikkaat",
  ohje: "Tee näin.",
  kertaa: 10,
  kesto_min: 5,
  taso: 1,
  taidot: ["Jalkatyö"],
  paikat: ["Kenttä"],
};

const form = ({ file, text }: { file?: File; text?: string }) => {
  const data = new FormData();
  // A browser sends the file field even when nothing is chosen, as an empty file.
  data.append("file", file ?? new File([], ""));
  data.append("text", text ?? "");
  return data;
};

beforeEach(() => {
  for (const mock of [requireTrainer, listExercises, importExercises, toStderr]) {
    mock.mockReset();
  }
  requireTrainer.mockResolvedValue({ user: USER, expiresAt: new Date() });
  listExercises.mockResolvedValue([]);
});

describe("importFromForm", () => {
  it("imports pasted text, and starts the form again empty", async () => {
    importExercises.mockResolvedValue({ kind: "imported", count: 2 });
    const text = JSON.stringify([EXERCISE, { ...EXERCISE, nimi: "Toinen" }]);
    const state = await importFromForm(START, form({ text }));
    expect(state).toEqual({
      version: 4,
      message: "Tuotu 2 harjoitetta.",
      refusal: null,
      failing: [],
      text: "",
    });
    expect(importExercises).toHaveBeenCalledWith("u1", [
      expect.objectContaining({ name: "Tikkaat", labels: ["footwork", "field"] }),
      expect.objectContaining({ name: "Toinen" }),
    ]);
    expect(listExercises).toHaveBeenCalledWith("u1");
  });

  it("imports a chosen file the same way", async () => {
    importExercises.mockResolvedValue({ kind: "imported", count: 1 });
    const file = new File([`\uFEFF${JSON.stringify([EXERCISE])}`], "harjoitteet.json");
    const state = await importFromForm(START, form({ file }));
    expect(state.message).toBe("Tuotu 1 harjoite.");
    expect(importExercises).toHaveBeenCalledWith("u1", [
      expect.objectContaining({ name: "Tikkaat" }),
    ]);
  });

  it("refuses the whole import, keeping the text, logging the reason and saving nothing", async () => {
    const state = await importFromForm(START, form({ text: "[1," }));
    expect(state).toEqual({
      version: 4,
      message: null,
      refusal: "Tämä ei ole JSON-muotoa.",
      failing: [],
      text: "[1,",
    });
    expect(toStderr).toHaveBeenCalledWith("exercise import refused: user u1, json");
    expect(importExercises).not.toHaveBeenCalled();
  });

  it("refuses neither and both before reading the library", async () => {
    expect((await importFromForm(START, form({}))).refusal).toBe(
      "Valitse tiedosto tai liitä teksti."
    );
    expect(toStderr).toHaveBeenLastCalledWith("exercise import refused: user u1, empty");
    const file = new File(["[]"], "a.json");
    expect((await importFromForm(START, form({ file, text: "[]" }))).refusal).toBe(
      "Valitse tiedosto tai liitä teksti, ei molempia."
    );
    expect(toStderr).toHaveBeenLastCalledWith("exercise import refused: user u1, both");
    expect(listExercises).not.toHaveBeenCalled();
  });

  it("reads a crafted request with no text field as no text", async () => {
    const data = new FormData();
    data.append("file", new File([], ""));
    expect((await importFromForm(START, data)).refusal).toBe("Valitse tiedosto tai liitä teksti.");
  });

  it("counts an empty file as none chosen, as a browser sends one for an empty field", async () => {
    const empty = new File([], "tyhja.json");
    expect((await importFromForm(START, form({ file: empty }))).refusal).toBe(
      "Valitse tiedosto tai liitä teksti."
    );
    importExercises.mockResolvedValue({ kind: "imported", count: 1 });
    const pasted = await importFromForm(
      START,
      form({ file: empty, text: JSON.stringify([EXERCISE]) })
    );
    expect(pasted.message).toBe("Tuotu 1 harjoite.");
  });

  it("lists every failing exercise, with the library's names, and logs the counts only", async () => {
    listExercises.mockResolvedValue([{ name: "Tikkaat" }]);
    const text = JSON.stringify([EXERCISE, { ...EXERCISE, nimi: "Toinen" }, { nimi: 5 }]);
    const state = await importFromForm(START, form({ text }));
    expect(state).toMatchObject({
      message: "2 harjoitetta ei kelpaa. Mitään ei tallennettu.",
      refusal: null,
      text,
      failing: [
        { heading: "Harjoite 1: Tikkaat", reasons: ["Samanniminen harjoite on jo kirjastossa."] },
        { heading: "Harjoite 3", reasons: expect.arrayContaining(["Valitse taso."]) },
      ],
    });
    expect(toStderr).toHaveBeenCalledWith(
      "exercise import refused: user u1, 2 of 3 exercises failing"
    );
    expect(importExercises).not.toHaveBeenCalled();
  });

  it("refuses the whole import when the library took a name meanwhile", async () => {
    importExercises.mockResolvedValue({ kind: "nameInUse" });
    const text = JSON.stringify([EXERCISE]);
    const state = await importFromForm(START, form({ text }));
    expect(state).toMatchObject({
      message: null,
      refusal:
        "Kirjastoon tallennettiin samanniminen harjoite tuonnin aikana. Mitään ei tallennettu; tuo uudelleen.",
      text,
    });
  });

  it("needs an unlock, and reads and saves nothing without one", async () => {
    requireTrainer.mockRejectedValue(new Error("redirect /valmentaja/avaa"));
    await expect(importFromForm(START, form({ text: JSON.stringify([EXERCISE]) }))).rejects.toThrow(
      "redirect /valmentaja/avaa"
    );
    expect(listExercises).not.toHaveBeenCalled();
    expect(importExercises).not.toHaveBeenCalled();
  });
});

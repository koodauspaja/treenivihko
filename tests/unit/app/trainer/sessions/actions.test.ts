import { beforeEach, describe, expect, it, vi } from "vitest";

const USER = { id: "u1", name: "Test Parent", sessionId: "s1" };
const requireTrainer = vi.fn();
const store = {
  addBlock: vi.fn(),
  addBlockExercise: vi.fn(),
  blockExerciseKind: vi.fn(),
  deleteBlock: vi.fn(),
  deleteBlockExercise: vi.fn(),
  deleteSession: vi.fn(),
  moveBlock: vi.fn(),
  moveBlockExercise: vi.fn(),
  updateBlockExerciseAmount: vi.fn(),
  updateBlockTheme: vi.fn(),
  updateSessionSettings: vi.fn(),
};
const refresh = vi.fn();
const redirect = vi.fn((path: string) => {
  throw new Error(`redirect ${path}`);
});

vi.mock("next/cache", () => ({ refresh: () => refresh() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));
vi.mock("@/lib/trainer/access", () => ({ requireTrainer: () => requireTrainer() }));
vi.mock("@/lib/periods/store", () =>
  Object.fromEntries(
    Object.entries(store).map(([name, mock]) => [name, (...args: unknown[]) => mock(...args)])
  )
);

const actions = await import("@/app/trainer/sessions/actions");

const START = { version: 3, message: null, errors: {} };
const ASKED = { version: 3, error: null };
const UNLOCK = new Error("redirect /valmentaja/avaa");

const form = (fields: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const each of [value].flat()) {
      data.append(name, each);
    }
  }
  return data;
};

beforeEach(() => {
  for (const mock of [requireTrainer, ...Object.values(store)]) {
    mock.mockReset();
  }
  refresh.mockClear();
  redirect.mockClear();
  requireTrainer.mockResolvedValue({ user: USER, expiresAt: new Date() });
});

describe("saveSessionSettings", () => {
  const VALID = { id: "t1", place: "indoors", equipment: ["cones", "ball"], targetMinutes: "30" };

  it("saves the place, equipment and target, says so, and refreshes", async () => {
    store.updateSessionSettings.mockResolvedValue({ kind: "saved", id: "t1" });
    const state = await actions.saveSessionSettings(START, form(VALID));
    expect(store.updateSessionSettings).toHaveBeenCalledWith("u1", "t1", {
      place: "indoors",
      equipment: ["ball", "cones"],
      targetMinutes: 30,
    });
    expect(state).toEqual({ version: 4, message: "Tallennettu.", errors: {} });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("drops an equipment value sent as a file", async () => {
    store.updateSessionSettings.mockResolvedValue({ kind: "saved", id: "t1" });
    const data = form({ ...VALID, equipment: "ball" });
    data.append("equipment", new Blob(["cones"]));
    await actions.saveSessionSettings(START, data);
    expect(store.updateSessionSettings).toHaveBeenCalledWith(
      "u1",
      "t1",
      expect.objectContaining({ equipment: ["ball"] })
    );
  });

  it("refuses a missing place and a wrong target, and saves nothing", async () => {
    const state = await actions.saveSessionSettings(START, form({ id: "t1", targetMinutes: "7" }));
    expect(state).toEqual({
      version: 4,
      message: null,
      errors: {
        place: "Valitse paikka.",
        target: "Tavoitekeston on oltava 5–120 minuuttia, 5 minuutin välein.",
      },
    });
    expect(store.updateSessionSettings).not.toHaveBeenCalled();
  });

  it("says a session deleted meanwhile is not found", async () => {
    store.updateSessionSettings.mockResolvedValue({ kind: "missing" });
    const state = await actions.saveSessionSettings(START, form(VALID));
    expect(state).toEqual({ version: 4, message: "Sivua ei löytynyt.", errors: {} });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("needs an unlock", async () => {
    requireTrainer.mockRejectedValue(UNLOCK);
    await expect(actions.saveSessionSettings(START, form(VALID))).rejects.toThrow(UNLOCK.message);
    expect(store.updateSessionSettings).not.toHaveBeenCalled();
  });
});

describe("removeSession", () => {
  it("deletes the session, then shows its period", async () => {
    store.deleteSession.mockResolvedValue("p1");
    await expect(actions.removeSession(ASKED, form({ id: "t1" }))).rejects.toThrow(
      "redirect /valmentaja/jaksot/p1"
    );
    expect(store.deleteSession).toHaveBeenCalledWith("u1", "t1");
  });

  it("shows the periods when the session was not found", async () => {
    store.deleteSession.mockResolvedValue(null);
    await expect(actions.removeSession(ASKED, form({ id: "gone" }))).rejects.toThrow(
      "redirect /valmentaja/jaksot"
    );
    expect(redirect).toHaveBeenCalledWith("/valmentaja/jaksot");
  });

  it("needs an unlock", async () => {
    requireTrainer.mockRejectedValue(UNLOCK);
    await expect(actions.removeSession(ASKED, form({ id: "t1" }))).rejects.toThrow(UNLOCK.message);
    expect(store.deleteSession).not.toHaveBeenCalled();
  });
});

describe("addBlockFromForm", () => {
  it("adds the block, trimmed, and refreshes", async () => {
    store.addBlock.mockResolvedValue({ kind: "saved", id: "b1" });
    const state = await actions.addBlockFromForm(
      START,
      form({ sessionId: "t1", theme: " Kuljetus " })
    );
    expect(store.addBlock).toHaveBeenCalledWith("u1", "t1", "Kuljetus");
    expect(state).toEqual({ version: 4, message: null, errors: {} });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("refuses a theme of the wrong length, and adds nothing", async () => {
    const state = await actions.addBlockFromForm(START, form({ sessionId: "t1", theme: "" }));
    expect(state.errors).toEqual({ theme: "Osion nimessä on oltava 1–30 merkkiä." });
    expect(store.addBlock).not.toHaveBeenCalled();
  });

  it("refuses a 7th block", async () => {
    store.addBlock.mockResolvedValue({ kind: "limit" });
    const state = await actions.addBlockFromForm(START, form({ sessionId: "t1", theme: "Osio" }));
    expect(state.errors).toEqual({ theme: "Treenissä voi olla enintään 6 osiota." });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("says a session deleted meanwhile is not found", async () => {
    store.addBlock.mockResolvedValue({ kind: "missing" });
    const state = await actions.addBlockFromForm(START, form({ sessionId: "t1", theme: "Osio" }));
    expect(state).toEqual({ version: 4, message: "Sivua ei löytynyt.", errors: {} });
  });

  it("needs an unlock", async () => {
    requireTrainer.mockRejectedValue(UNLOCK);
    await expect(
      actions.addBlockFromForm(START, form({ sessionId: "t1", theme: "Osio" }))
    ).rejects.toThrow(UNLOCK.message);
    expect(store.addBlock).not.toHaveBeenCalled();
  });
});

describe("saveBlockTheme", () => {
  it("renames the block, says so, and refreshes", async () => {
    store.updateBlockTheme.mockResolvedValue("b1");
    const state = await actions.saveBlockTheme(START, form({ id: "b1", theme: "Laukaus" }));
    expect(store.updateBlockTheme).toHaveBeenCalledWith("u1", "b1", "Laukaus");
    expect(state).toEqual({ version: 4, message: "Tallennettu.", errors: {} });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("refuses a theme of the wrong length", async () => {
    const state = await actions.saveBlockTheme(START, form({ id: "b1", theme: "a".repeat(31) }));
    expect(state.errors).toEqual({ theme: "Osion nimessä on oltava 1–30 merkkiä." });
    expect(store.updateBlockTheme).not.toHaveBeenCalled();
  });

  it("says a block deleted meanwhile is not found", async () => {
    store.updateBlockTheme.mockResolvedValue(null);
    const state = await actions.saveBlockTheme(START, form({ id: "gone", theme: "Laukaus" }));
    expect(state).toEqual({ version: 4, message: "Sivua ei löytynyt.", errors: {} });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("needs an unlock", async () => {
    requireTrainer.mockRejectedValue(UNLOCK);
    await expect(
      actions.saveBlockTheme(START, form({ id: "b1", theme: "Laukaus" }))
    ).rejects.toThrow(UNLOCK.message);
  });
});

describe("the moves", () => {
  it("move a block up or down, and anything but up is down", async () => {
    await actions.moveBlockFromForm(form({ id: "b1", direction: "up" }));
    await actions.moveBlockFromForm(form({ id: "b1", direction: "down" }));
    await actions.moveBlockFromForm(form({ id: "b1", direction: "sideways" }));
    expect(store.moveBlock.mock.calls).toEqual([
      ["u1", "b1", "up"],
      ["u1", "b1", "down"],
      ["u1", "b1", "down"],
    ]);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it("move a block exercise up or down", async () => {
    await actions.moveBlockExerciseFromForm(form({ id: "x1", direction: "up" }));
    await actions.moveBlockExerciseFromForm(form({ id: "x1" }));
    expect(store.moveBlockExercise.mock.calls).toEqual([
      ["u1", "x1", "up"],
      ["u1", "x1", "down"],
    ]);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("need an unlock", async () => {
    requireTrainer.mockRejectedValue(UNLOCK);
    await expect(actions.moveBlockFromForm(form({ id: "b1" }))).rejects.toThrow(UNLOCK.message);
    await expect(actions.moveBlockExerciseFromForm(form({ id: "x1" }))).rejects.toThrow(
      UNLOCK.message
    );
    expect(store.moveBlock).not.toHaveBeenCalled();
    expect(store.moveBlockExercise).not.toHaveBeenCalled();
  });
});

describe("the removals", () => {
  it("delete a block, and refresh", async () => {
    expect(await actions.removeBlock(ASKED, form({ id: "b1" }))).toEqual({
      version: 4,
      error: null,
    });
    expect(store.deleteBlock).toHaveBeenCalledWith("u1", "b1");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("take an exercise out of its block, and refresh", async () => {
    await actions.removeBlockExercise(form({ id: "x1" }));
    expect(store.deleteBlockExercise).toHaveBeenCalledWith("u1", "x1");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("need an unlock", async () => {
    requireTrainer.mockRejectedValue(UNLOCK);
    await expect(actions.removeBlock(ASKED, form({ id: "b1" }))).rejects.toThrow(UNLOCK.message);
    await expect(actions.removeBlockExercise(form({ id: "x1" }))).rejects.toThrow(UNLOCK.message);
    expect(store.deleteBlock).not.toHaveBeenCalled();
    expect(store.deleteBlockExercise).not.toHaveBeenCalled();
  });
});

describe("addBlockExerciseFromForm", () => {
  it("adds the exercise last in its block, then shows the session", async () => {
    store.addBlockExercise.mockResolvedValue({ kind: "saved", sessionId: "t1" });
    await expect(
      actions.addBlockExerciseFromForm(ASKED, form({ blockId: "b1", exerciseId: "e1" }))
    ).rejects.toThrow("redirect /valmentaja/treenit/t1");
    expect(store.addBlockExercise).toHaveBeenCalledWith("u1", "b1", "e1");
  });

  it("refuses an 11th exercise", async () => {
    store.addBlockExercise.mockResolvedValue({ kind: "limit" });
    expect(
      await actions.addBlockExerciseFromForm(ASKED, form({ blockId: "b1", exerciseId: "e1" }))
    ).toEqual({ version: 4, error: "Osiossa voi olla enintään 10 harjoitetta." });
  });

  it("says a block or an exercise gone meanwhile is not found", async () => {
    store.addBlockExercise.mockResolvedValue({ kind: "missing" });
    expect(
      await actions.addBlockExerciseFromForm(ASKED, form({ blockId: "b1", exerciseId: "e1" }))
    ).toEqual({ version: 4, error: "Sivua ei löytynyt." });
  });

  it("needs an unlock", async () => {
    requireTrainer.mockRejectedValue(UNLOCK);
    await expect(
      actions.addBlockExerciseFromForm(ASKED, form({ blockId: "b1", exerciseId: "e1" }))
    ).rejects.toThrow(UNLOCK.message);
    expect(store.addBlockExercise).not.toHaveBeenCalled();
  });
});

describe("saveBlockAmount", () => {
  it("saves an amount by its kind's rule, says so, and refreshes", async () => {
    store.blockExerciseKind.mockResolvedValue("time");
    store.updateBlockExerciseAmount.mockResolvedValue("x1");
    const state = await actions.saveBlockAmount(START, form({ id: "x1", amount: "45" }));
    expect(store.updateBlockExerciseAmount).toHaveBeenCalledWith("u1", "x1", 45);
    expect(state).toEqual({ version: 4, message: "Tallennettu.", errors: {} });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("refuses an amount outside its kind's rule", async () => {
    store.blockExerciseKind.mockResolvedValue("count");
    const state = await actions.saveBlockAmount(START, form({ id: "x1", amount: "101" }));
    expect(state.errors).toEqual({ amount: "Kertoja on oltava 1–100." });
    expect(store.updateBlockExerciseAmount).not.toHaveBeenCalled();
    store.blockExerciseKind.mockResolvedValue("time");
    const time = await actions.saveBlockAmount(START, form({ id: "x1", amount: "7" }));
    expect(time.errors).toEqual({ amount: "Ajan on oltava 5 s – 10 min, 5 sekunnin välein." });
  });

  it("says a block exercise gone before or during the save is not found", async () => {
    store.blockExerciseKind.mockResolvedValue(null);
    expect(await actions.saveBlockAmount(START, form({ id: "gone", amount: "5" }))).toEqual({
      version: 4,
      message: "Sivua ei löytynyt.",
      errors: {},
    });
    expect(store.updateBlockExerciseAmount).not.toHaveBeenCalled();
    store.blockExerciseKind.mockResolvedValue("count");
    store.updateBlockExerciseAmount.mockResolvedValue(null);
    expect(await actions.saveBlockAmount(START, form({ id: "x1", amount: "5" }))).toEqual({
      version: 4,
      message: "Sivua ei löytynyt.",
      errors: {},
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("needs an unlock", async () => {
    requireTrainer.mockRejectedValue(UNLOCK);
    await expect(actions.saveBlockAmount(START, form({ id: "x1", amount: "5" }))).rejects.toThrow(
      UNLOCK.message
    );
    expect(store.blockExerciseKind).not.toHaveBeenCalled();
  });
});

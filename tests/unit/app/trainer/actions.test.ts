import { beforeEach, describe, expect, it, vi } from "vitest";

const USER = { id: "u1", name: "Test Parent", sessionId: "s1" };
const requireUser = vi.fn();
const requireTrainer = vi.fn();
const tryPassword = vi.fn();
const saveNickname = vi.fn();
const lockTrainer = vi.fn();
const refresh = vi.fn();
const redirect = vi.fn((path: string) => {
  throw new Error(`redirect ${path}`);
});

vi.mock("next/cache", () => ({ refresh: () => refresh() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));
vi.mock("@/lib/auth/session", () => ({ requireUser: () => requireUser() }));
vi.mock("@/lib/trainer/access", () => ({ requireTrainer: () => requireTrainer() }));
vi.mock("@/lib/trainer/store", () => ({
  tryPassword: (...args: unknown[]) => tryPassword(...args),
  saveNickname: (...args: unknown[]) => saveNickname(...args),
  lockTrainer: (...args: unknown[]) => lockTrainer(...args),
}));

const { lockTrainerSide, saveChildNickname, unlockTrainer } = await import("@/app/trainer/actions");

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    data.set(name, value);
  }
  return data;
};

beforeEach(() => {
  for (const mock of [requireUser, requireTrainer, tryPassword, saveNickname, lockTrainer]) {
    mock.mockReset();
  }
  refresh.mockClear();
  redirect.mockClear();
  requireUser.mockResolvedValue(USER);
  requireTrainer.mockResolvedValue({ user: USER, expiresAt: new Date() });
});

describe("unlockTrainer", () => {
  it("opens the trainer side with the right password, for this browser", async () => {
    tryPassword.mockResolvedValue({ kind: "unlocked" });
    await expect(unlockTrainer(null, form({ password: "the password" }))).rejects.toThrow(
      "redirect /valmentaja"
    );
    expect(tryPassword).toHaveBeenCalledWith(
      { userId: "u1", sessionId: "s1", password: "the password" },
      expect.any(Date)
    );
  });

  it.each([
    [{ kind: "wrong" }, "Väärä salasana."],
    [{ kind: "none" }, "Valmentajan salasanaa ei ole vielä asetettu."],
  ])("says why %j did not open it", async (result, message) => {
    tryPassword.mockResolvedValue(result);
    expect(await unlockTrainer(null, form({ password: "x" }))).toEqual({ message, error: true });
  });

  it("says how long a lockout lasts", async () => {
    tryPassword.mockResolvedValue({ kind: "locked", until: new Date(Date.now() + 15 * 60_000) });
    expect(await unlockTrainer(null, form({ password: "x" }))).toEqual({
      message: "Liian monta yritystä. Yritä uudelleen 15 minuutin päästä.",
      error: true,
    });
  });

  it("tries a missing password as an empty one, which is wrong", async () => {
    tryPassword.mockResolvedValue({ kind: "wrong" });
    await unlockTrainer(null, new FormData());
    expect(tryPassword).toHaveBeenCalledWith(
      { userId: "u1", sessionId: "s1", password: "" },
      expect.any(Date)
    );
  });

  it("needs a signed-in user before it tries anything", async () => {
    requireUser.mockRejectedValue(new Error("redirect /kirjaudu"));
    await expect(unlockTrainer(null, form({ password: "x" }))).rejects.toThrow(
      "redirect /kirjaudu"
    );
    expect(tryPassword).not.toHaveBeenCalled();
  });
});

describe("saveChildNickname", () => {
  it("saves the trimmed nickname and refreshes the page", async () => {
    expect(await saveChildNickname(null, form({ nickname: "  Testi " }))).toEqual({
      message: "Tallennettu.",
      error: false,
    });
    expect(saveNickname).toHaveBeenCalledWith("u1", "Testi");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("refuses a nickname of the wrong length, and saves nothing", async () => {
    expect(await saveChildNickname(null, form({ nickname: "x".repeat(21) }))).toEqual({
      message: "Nimessä on oltava 1–20 merkkiä.",
      error: true,
    });
    expect(saveNickname).not.toHaveBeenCalled();
  });

  it("needs an unlock, and saves nothing without one", async () => {
    requireTrainer.mockRejectedValue(new Error("redirect /valmentaja/avaa"));
    await expect(saveChildNickname(null, form({ nickname: "Testi" }))).rejects.toThrow(
      "redirect /valmentaja/avaa"
    );
    expect(saveNickname).not.toHaveBeenCalled();
  });
});

describe("lockTrainerSide", () => {
  it("ends this browser's unlock and returns to the child's side", async () => {
    await expect(lockTrainerSide()).rejects.toThrow("redirect /");
    expect(lockTrainer).toHaveBeenCalledWith("u1", "s1");
  });
});

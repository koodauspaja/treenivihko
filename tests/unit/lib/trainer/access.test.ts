import { beforeEach, describe, expect, it, vi } from "vitest";

const USER = { id: "u1", name: "Test Parent", sessionId: "s1" };
const requireUser = vi.fn();
const touchUnlock = vi.fn();
const redirect = vi.fn((path: string) => {
  throw new Error(`redirect ${path}`);
});

vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));
vi.mock("@/lib/auth/session", () => ({ requireUser: () => requireUser() }));
vi.mock("@/lib/trainer/store", () => ({
  touchUnlock: (...args: unknown[]) => touchUnlock(...args),
}));

const { requireTrainer } = await import("@/lib/trainer/access");

const NOW = new Date("2026-10-27T12:00:00.000Z");

beforeEach(() => {
  requireUser.mockReset().mockResolvedValue(USER);
  touchUnlock.mockReset();
  redirect.mockClear();
});

describe("requireTrainer", () => {
  it("moves this browser's unlock on, and hands back the user and its new end", async () => {
    const end = new Date("2026-10-27T12:15:00.000Z");
    touchUnlock.mockResolvedValue(end);
    expect(await requireTrainer(NOW)).toEqual({ user: USER, expiresAt: end });
    expect(touchUnlock).toHaveBeenCalledWith("s1", NOW);
  });

  it("sends a browser without an unlock to the lock page", async () => {
    touchUnlock.mockResolvedValue(null);
    await expect(requireTrainer(NOW)).rejects.toThrow("redirect /valmentaja/avaa");
  });

  it("asks for the user first, and touches nothing without one", async () => {
    requireUser.mockRejectedValue(new Error("redirect /kirjaudu"));
    await expect(requireTrainer(NOW)).rejects.toThrow("redirect /kirjaudu");
    expect(touchUnlock).not.toHaveBeenCalled();
  });
});

describe("requireTrainer's clock", () => {
  it("reads the time itself when given none", async () => {
    touchUnlock.mockResolvedValue(new Date());
    await requireTrainer();
    expect(touchUnlock).toHaveBeenCalledWith("s1", expect.any(Date));
  });
});

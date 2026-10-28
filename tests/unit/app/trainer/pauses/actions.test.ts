/**
 * The pauses' actions: each checks the unlock, reads its form, and answers
 * with the store's outcome.
 *
 * decisions/f008-streaks-and-accomplishments.md
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const USER = { id: "u1", name: "Test Parent", sessionId: "s1" };
const requireTrainer = vi.fn();
const createPause = vi.fn();
const deletePause = vi.fn();
const refresh = vi.fn();
const redirect = vi.fn((path: string) => {
  throw new Error(`redirect ${path}`);
});

vi.mock("next/cache", () => ({ refresh: () => refresh() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));
vi.mock("@/lib/trainer/access", () => ({ requireTrainer: () => requireTrainer() }));
vi.mock("@/lib/streaks/store", () => ({
  createPause: (...args: unknown[]) => createPause(...args),
  deletePause: (...args: unknown[]) => deletePause(...args),
}));

const { createPauseFromForm, removePause } = await import("@/app/trainer/pauses/actions");

const VALUES = { startsOn: "2026-11-03", endsOn: "2026-11-09" };
const START = { version: 3, errors: {}, values: VALUES };

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    data.append(name, value);
  }
  return data;
};

beforeEach(() => {
  for (const mock of [requireTrainer, createPause, deletePause]) {
    mock.mockReset();
  }
  refresh.mockClear();
  redirect.mockClear();
  requireTrainer.mockResolvedValue({ user: USER, expiresAt: new Date() });
});

describe("createPauseFromForm", () => {
  it("adds the pause, and refreshes the page to list it", async () => {
    createPause.mockResolvedValue({ kind: "saved", id: "pa1" });
    expect(await createPauseFromForm(START, form(VALUES))).toEqual({
      version: 4,
      errors: {},
      values: VALUES,
    });
    expect(createPause).toHaveBeenCalledWith("u1", VALUES);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("shows a field's refusal, keeping what was sent, and saves nothing", async () => {
    const sent = { startsOn: "2026-11-09", endsOn: "2026-11-03" };
    expect(await createPauseFromForm(START, form(sent))).toEqual({
      version: 4,
      errors: { endsOn: "Tauko ei voi päättyä ennen alkuaan." },
      values: sent,
    });
    expect(createPause).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("names the pause it overlaps, beside the start", async () => {
    createPause.mockResolvedValue({
      kind: "overlap",
      with: { id: "pa0", startsOn: "2026-11-01", endsOn: "2026-11-04" },
    });
    expect(await createPauseFromForm(START, form(VALUES))).toEqual({
      version: 4,
      errors: { startsOn: "Tauko menee päällekkäin tauon 1.11.–4.11.2026 kanssa." },
      values: VALUES,
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("says not found when the pause it overlapped is gone again", async () => {
    createPause.mockResolvedValue({ kind: "missing" });
    expect((await createPauseFromForm(START, form(VALUES))).errors).toEqual({
      startsOn: "Sivua ei löytynyt.",
    });
  });

  it("goes to the unlock page without an unlock, and saves nothing", async () => {
    requireTrainer.mockRejectedValue(new Error("redirect /valmentaja/avaa"));
    await expect(createPauseFromForm(START, form(VALUES))).rejects.toThrow("redirect");
    expect(createPause).not.toHaveBeenCalled();
  });
});

describe("removePause", () => {
  it("deletes the pause, then shows the pauses, whether it was there or not", async () => {
    for (const found of [true, false]) {
      deletePause.mockResolvedValue(found);
      await expect(removePause({ version: 1, error: null }, form({ id: "pa1" }))).rejects.toThrow(
        "redirect /valmentaja/tauot"
      );
    }
    expect(deletePause).toHaveBeenCalledWith("u1", "pa1");
  });

  it("goes to the unlock page without an unlock, and deletes nothing", async () => {
    requireTrainer.mockRejectedValue(new Error("redirect /valmentaja/avaa"));
    await expect(removePause({ version: 1, error: null }, form({ id: "pa1" }))).rejects.toThrow(
      "redirect /valmentaja/avaa"
    );
    expect(deletePause).not.toHaveBeenCalled();
  });
});

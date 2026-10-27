import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const passwordState = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireUser: () => requireUser() }));
vi.mock("@/lib/trainer/store", () => ({
  passwordState: (...args: unknown[]) => passwordState(...args),
}));
vi.mock("@/components/unlock-form", () => ({ UnlockForm: () => <p>the password form</p> }));

const { LockPanel } = await import("@/components/lock-panel");

beforeEach(() => {
  requireUser.mockReset().mockResolvedValue({ id: "u1", name: "Test Parent", sessionId: "s1" });
  passwordState.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("LockPanel", () => {
  it("offers the password form when there is a password and no lockout", async () => {
    passwordState.mockResolvedValue({ kind: "ready" });
    render(await LockPanel());
    expect(passwordState).toHaveBeenCalledWith("u1", expect.any(Date));
    expect(screen.getByText("the password form")).toBeDefined();
  });

  it("says no password is set, with no form", async () => {
    passwordState.mockResolvedValue({ kind: "none" });
    render(await LockPanel());
    expect(screen.getByRole("alert").textContent).toBe(
      "Valmentajan salasanaa ei ole vielä asetettu."
    );
    expect(screen.queryByText("the password form")).toBeNull();
  });

  it("says how long a lockout lasts, with no form", async () => {
    passwordState.mockResolvedValue({
      kind: "locked",
      until: new Date(Date.now() + 10 * 60_000 - 1_000),
    });
    render(await LockPanel());
    expect(screen.getByRole("alert").textContent).toBe(
      "Liian monta yritystä. Yritä uudelleen 10 minuutin päästä."
    );
    expect(screen.queryByText("the password form")).toBeNull();
  });
});

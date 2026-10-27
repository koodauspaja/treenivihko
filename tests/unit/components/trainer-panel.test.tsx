import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireTrainer = vi.fn();
const ensureChild = vi.fn();
const lockTrainerSide = vi.fn();
vi.mock("@/lib/trainer/access", () => ({ requireTrainer: () => requireTrainer() }));
vi.mock("@/lib/trainer/store", () => ({
  ensureChild: (...args: unknown[]) => ensureChild(...args),
}));
vi.mock("@/app/trainer/actions", () => ({ lockTrainerSide: () => lockTrainerSide() }));
vi.mock("@/components/nickname-form", () => ({
  NicknameForm: ({ nickname }: { nickname: string | null }) => <p>nickname {String(nickname)}</p>,
}));
vi.mock("@/components/sign-out-button", () => ({ SignOutButton: () => <p>sign-out</p> }));
vi.mock("@/components/trainer-timeout", () => ({
  TrainerTimeout: ({ expiresAt }: { expiresAt: string }) => <p>timeout {expiresAt}</p>,
}));

const { TrainerPanel } = await import("@/components/trainer-panel");

const END = new Date("2026-10-27T12:15:00.000Z");

beforeEach(() => {
  requireTrainer.mockReset().mockResolvedValue({
    user: { id: "u1", name: "Test Parent", sessionId: "s1" },
    expiresAt: END,
  });
  ensureChild.mockReset().mockResolvedValue({ id: "c1", nickname: "Testi" });
});

afterEach(() => {
  cleanup();
});

describe("TrainerPanel", () => {
  it("shows the nickname, the lock and sign-out, and times out when the unlock ends", async () => {
    render(await TrainerPanel());
    expect(ensureChild).toHaveBeenCalledWith("u1");
    expect(screen.getByText("nickname Testi")).toBeDefined();
    expect(screen.getByRole("button", { name: "Lukitse" })).toBeDefined();
    expect(screen.getByText("sign-out")).toBeDefined();
    expect(screen.getByText(`timeout ${END.toISOString()}`)).toBeDefined();
  });

  it("shows nothing without an unlock", async () => {
    requireTrainer.mockRejectedValue(new Error("redirect /valmentaja/avaa"));
    await expect(TrainerPanel()).rejects.toThrow("redirect /valmentaja/avaa");
    expect(ensureChild).not.toHaveBeenCalled();
  });
});

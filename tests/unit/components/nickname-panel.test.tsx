import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireTrainer = vi.fn();
const ensureChild = vi.fn();
vi.mock("@/lib/trainer/access", () => ({ requireTrainer: () => requireTrainer() }));
vi.mock("@/lib/trainer/store", () => ({
  ensureChild: (...args: unknown[]) => ensureChild(...args),
}));
vi.mock("@/components/nickname-form", () => ({
  NicknameForm: ({ nickname }: { nickname: string | null }) => <p>nickname {String(nickname)}</p>,
}));
vi.mock("@/components/trainer-timeout", () => ({ TrainerTimeout: () => <p>timeout</p> }));

const { NicknamePanel } = await import("@/components/nickname-panel");

beforeEach(() => {
  requireTrainer.mockReset().mockResolvedValue({
    user: { id: "u1", name: "Test Parent", sessionId: "s1" },
    expiresAt: new Date(),
  });
  ensureChild.mockReset().mockResolvedValue({ id: "c1", nickname: "Testi" });
});

afterEach(() => {
  cleanup();
});

describe("NicknamePanel", () => {
  it("shows the child's nickname form behind the unlock", async () => {
    render(await NicknamePanel());
    expect(ensureChild).toHaveBeenCalledWith("u1");
    expect(screen.getByText("nickname Testi")).toBeDefined();
    expect(screen.getByText("timeout")).toBeDefined();
  });

  it("shows nothing without an unlock", async () => {
    requireTrainer.mockRejectedValue(new Error("redirect /valmentaja/avaa"));
    await expect(NicknamePanel()).rejects.toThrow("redirect /valmentaja/avaa");
    expect(ensureChild).not.toHaveBeenCalled();
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireTrainer = vi.fn();
vi.mock("@/lib/trainer/access", () => ({ requireTrainer: () => requireTrainer() }));
vi.mock("@/app/trainer/actions", () => ({ lockTrainerSide: vi.fn() }));
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
});

afterEach(() => {
  cleanup();
});

describe("TrainerPanel", () => {
  it("is the menu: the periods first, the pauses, the library, the nickname, Lukitse ja palaa and sign-out", async () => {
    render(await TrainerPanel());
    const links = screen.getAllByRole("link");
    expect(links.map((each) => each.textContent)).toEqual([
      "Jaksot",
      "Tauot",
      "Harjoitteet",
      "Lapsen nimi",
    ]);
    expect(links[0]?.getAttribute("href")).toBe("/valmentaja/jaksot");
    expect(links[1]?.getAttribute("href")).toBe("/valmentaja/tauot");
    expect(screen.getByRole("link", { name: "Harjoitteet" }).getAttribute("href")).toBe(
      "/valmentaja/harjoitteet"
    );
    expect(screen.getByRole("link", { name: "Lapsen nimi" }).getAttribute("href")).toBe(
      "/valmentaja/nimi"
    );
    expect(screen.getByRole("button", { name: "Lukitse ja palaa" })).toBeDefined();
    expect(screen.getByText("sign-out")).toBeDefined();
    expect(screen.getByText(`timeout ${END.toISOString()}`)).toBeDefined();
  });

  it("shows nothing without an unlock", async () => {
    requireTrainer.mockRejectedValue(new Error("redirect /valmentaja/avaa"));
    await expect(TrainerPanel()).rejects.toThrow("redirect /valmentaja/avaa");
  });
});

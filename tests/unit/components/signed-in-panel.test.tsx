import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const ensureChild = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireUser: () => requireUser() }));
vi.mock("@/components/notebook", () => ({
  Notebook: ({ userId }: { userId: string }) => <p>notebook {userId}</p>,
}));
vi.mock("@/lib/trainer/store", () => ({
  ensureChild: (...args: unknown[]) => ensureChild(...args),
}));

const { SignedInPanel } = await import("@/components/signed-in-panel");

beforeEach(() => {
  requireUser.mockReset().mockResolvedValue({ id: "u1", name: "Test Parent", sessionId: "s1" });
  ensureChild.mockReset().mockResolvedValue({ id: "c1", nickname: null });
});

afterEach(() => {
  cleanup();
});

describe("SignedInPanel", () => {
  it("requires a signed-in browser, then greets the child and shows the period, and nothing else of the parent's", async () => {
    const { container } = render(await SignedInPanel());
    expect(requireUser).toHaveBeenCalledOnce();
    expect(ensureChild).toHaveBeenCalledWith("u1");
    expect(screen.getByRole("heading", { level: 2, name: "Hei!" })).toBeDefined();
    expect(screen.getByText("notebook u1")).toBeDefined();
    expect(container.textContent).not.toContain("Treenit tulevat tänne pian.");
    expect(container.textContent).not.toContain("Test Parent");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("greets the child by nickname once there is one", async () => {
    ensureChild.mockResolvedValue({ id: "c1", nickname: "Testi" });
    render(await SignedInPanel());
    expect(screen.getByRole("heading", { level: 2, name: "Hei, Testi!" })).toBeDefined();
  });

  it("links to the child's progress after the period, before the trainer side", async () => {
    render(await SignedInPanel());
    const progress = screen.getByRole("link", { name: "Omat treenit" });
    expect(progress.getAttribute("href")).toBe("/omat-treenit");
    expect(screen.getAllByRole("link").map((each) => each.textContent)).toEqual([
      "Omat treenit",
      "Valmentaja",
    ]);
  });

  it("links to the trainer side's address", async () => {
    render(await SignedInPanel());
    expect(screen.getByRole("link", { name: "Valmentaja" }).getAttribute("href")).toBe(
      "/valmentaja"
    );
  });
});

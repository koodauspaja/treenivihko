import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const requireUser = vi.fn(async () => ({ id: "u1", name: "Test Parent" }));
vi.mock("@/lib/auth/session", () => ({ requireUser: () => requireUser() }));

const { SignedInPanel } = await import("@/components/signed-in-panel");

describe("SignedInPanel", () => {
  it("requires a signed-in browser, then shows the child's placeholder and nothing of the parent's", async () => {
    const { container } = render(await SignedInPanel());
    expect(requireUser).toHaveBeenCalledOnce();
    expect(screen.getByText("Treenit tulevat tänne pian.")).toBeDefined();
    expect(container.textContent).not.toContain("Test Parent");
    expect(screen.queryByRole("button")).toBeNull();
  });
});

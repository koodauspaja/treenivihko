import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/signed-in-panel", () => ({
  SignedInPanel: () => <p>the child's side</p>,
}));

const { default: Home } = await import("@/app/page");

describe("the home page", () => {
  it("shows the app's name, and the child's side for a signed-in browser", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: "Treenivihko" })).toBeDefined();
    expect(screen.getByText("the child's side")).toBeDefined();
  });
});

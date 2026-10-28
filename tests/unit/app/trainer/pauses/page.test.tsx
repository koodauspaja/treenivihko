import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/pause-views", () => ({
  PauseList: () => <p>the pauses</p>,
}));

const { default: PausesPage } = await import("@/app/trainer/pauses/page");

afterEach(() => {
  cleanup();
});

describe("the pauses' page", () => {
  it("is headed Tauot, says what a pause does, lists the pauses, and leads back to the menu", () => {
    render(<PausesPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Tauot" })).toBeDefined();
    expect(screen.getByText("Tauon aikana putki ei katkea.")).toBeDefined();
    expect(screen.getByText("the pauses")).toBeDefined();
    expect(screen.getByRole("link", { name: "Takaisin" }).getAttribute("href")).toBe("/valmentaja");
  });
});

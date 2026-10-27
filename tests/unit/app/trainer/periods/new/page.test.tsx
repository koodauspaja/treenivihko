import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/period-views", () => ({ NewPeriod: () => <p>the new period</p> }));

const { default: NewPeriodPage } = await import("@/app/trainer/periods/new/page");

afterEach(() => {
  cleanup();
});

describe("the new period page", () => {
  it("is headed Uusi jakso, with its form and a way back to the periods", () => {
    render(<NewPeriodPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Uusi jakso" })).toBeDefined();
    expect(screen.getByText("the new period")).toBeDefined();
    expect(screen.getByRole("link", { name: "Takaisin" }).getAttribute("href")).toBe(
      "/valmentaja/jaksot"
    );
  });
});

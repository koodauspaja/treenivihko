import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/period-views", () => ({ PeriodList: () => <p>the periods</p> }));

const { default: PeriodsPage } = await import("@/app/trainer/periods/page");

afterEach(() => {
  cleanup();
});

describe("the periods page", () => {
  it("is headed Jaksot, with a link to a new period, the periods and a way back to the menu", () => {
    render(<PeriodsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Jaksot" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Uusi jakso" }).getAttribute("href")).toBe(
      "/valmentaja/jaksot/uusi"
    );
    expect(screen.getByText("the periods")).toBeDefined();
    expect(screen.getByRole("link", { name: "Takaisin" }).getAttribute("href")).toBe("/valmentaja");
  });
});

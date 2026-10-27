import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const seen = vi.fn();
vi.mock("@/components/period-views", () => ({
  PeriodView: ({ id }: { id: Promise<string> }) => {
    seen(id);
    return <p>the period</p>;
  },
}));

const { default: PeriodPage } = await import("@/app/trainer/periods/[id]/page");

afterEach(() => {
  cleanup();
});

describe("a period's page", () => {
  it("shows the period by its id, with a way back to the periods", async () => {
    render(
      <PeriodPage params={Promise.resolve({ id: "p1" })} searchParams={Promise.resolve({})} />
    );
    expect(screen.getByText("the period")).toBeDefined();
    expect(await seen.mock.calls[0]?.[0]).toBe("p1");
    expect(screen.getByRole("link", { name: "Takaisin" }).getAttribute("href")).toBe(
      "/valmentaja/jaksot"
    );
  });
});

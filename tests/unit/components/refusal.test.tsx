import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Refusal } from "@/components/refusal";

afterEach(() => {
  cleanup();
});

describe("Refusal", () => {
  it("reads a refusal out as an alert, and shows nothing without one", () => {
    render(<Refusal message="Valitse kesto." />);
    expect(screen.getByRole("alert").textContent).toBe("Valitse kesto.");
    cleanup();
    render(<Refusal message={undefined} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

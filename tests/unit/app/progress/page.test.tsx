import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/progress", () => ({
  ProgressView: () => <p>the progress</p>,
}));

const { default: ProgressPage } = await import("@/app/progress/page");

afterEach(() => {
  cleanup();
});

describe("the progress page", () => {
  it("shows the child's progress", () => {
    render(<ProgressPage />);
    expect(screen.getByText("the progress")).toBeDefined();
  });
});

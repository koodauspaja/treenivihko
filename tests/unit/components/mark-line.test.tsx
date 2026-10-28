import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MarkLine } from "@/components/mark-line";

afterEach(() => {
  cleanup();
});

describe("MarkLine", () => {
  it("shows a mark's status, day and face as one line", () => {
    render(<MarkLine mark={{ status: "done", trainedOn: "2026-11-03", feeling: 5 }} />);
    expect(screen.getByText("Tehty 3.11.2026 😄")).toBeDefined();
  });

  it("leaves out a skipped face, and a not-done session's day", () => {
    render(<MarkLine mark={{ status: "partly", trainedOn: "2026-11-03", feeling: null }} />);
    expect(screen.getByText("Osittain 3.11.2026")).toBeDefined();
    render(
      <MarkLine mark={{ status: "not_done", trainedOn: null, feeling: null }} className="text-sm" />
    );
    expect(screen.getByText("Ei tehty").className).toBe("text-sm");
  });
});

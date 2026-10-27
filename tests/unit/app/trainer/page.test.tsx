import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/trainer-panel", () => ({ TrainerPanel: () => <p>the trainer panel</p> }));

const { default: TrainerPage } = await import("@/app/trainer/page");

afterEach(() => {
  cleanup();
});

describe("the trainer page", () => {
  it("is headed Valmentaja, with the panel behind its unlock", () => {
    render(<TrainerPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Valmentaja" })).toBeDefined();
    expect(screen.getByText("the trainer panel")).toBeDefined();
  });
});

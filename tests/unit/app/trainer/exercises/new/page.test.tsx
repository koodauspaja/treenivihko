import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/exercise-editor", () => ({ NewExercise: () => <p>the new form</p> }));

const { default: NewExercisePage } = await import("@/app/trainer/exercises/new/page");

afterEach(() => {
  cleanup();
});

describe("the new exercise page", () => {
  it("is headed Uusi harjoite, with the form and a way back to the library", () => {
    render(<NewExercisePage />);
    expect(screen.getByRole("heading", { level: 1, name: "Uusi harjoite" })).toBeDefined();
    expect(screen.getByText("the new form")).toBeDefined();
    expect(screen.getByRole("link", { name: "Takaisin" }).getAttribute("href")).toBe(
      "/valmentaja/harjoitteet"
    );
  });
});

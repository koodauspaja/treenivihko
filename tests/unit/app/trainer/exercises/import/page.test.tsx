import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/exercise-import", () => ({ ExerciseImport: () => <p>the import</p> }));

const { default: ImportPage } = await import("@/app/trainer/exercises/import/page");

afterEach(() => {
  cleanup();
});

describe("the import page", () => {
  it("is headed Tuo harjoitteita, with the import and a way back to the library", () => {
    render(<ImportPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Tuo harjoitteita" })).toBeDefined();
    expect(screen.getByText("the import")).toBeDefined();
    expect(screen.getByRole("link", { name: "Takaisin" }).getAttribute("href")).toBe(
      "/valmentaja/harjoitteet"
    );
  });
});

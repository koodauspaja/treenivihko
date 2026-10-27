import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/exercise-library", () => ({ ExerciseLibrary: () => <p>the library</p> }));

const { default: ExercisesPage } = await import("@/app/trainer/exercises/page");

afterEach(() => {
  cleanup();
});

describe("the library page", () => {
  it("is headed Harjoitteet, with a new exercise's link, the library and a way back", () => {
    render(<ExercisesPage params={Promise.resolve({})} searchParams={Promise.resolve({})} />);
    expect(screen.getByRole("heading", { level: 1, name: "Harjoitteet" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Uusi harjoite" }).getAttribute("href")).toBe(
      "/valmentaja/harjoitteet/uusi"
    );
    expect(screen.getByText("the library")).toBeDefined();
    expect(screen.getByRole("link", { name: "Takaisin" }).getAttribute("href")).toBe("/valmentaja");
  });
});

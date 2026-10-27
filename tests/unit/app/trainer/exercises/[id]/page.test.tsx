import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const seen = vi.fn();
vi.mock("@/components/exercise-editor", () => ({
  ExistingExercise: ({ id }: { id: Promise<string> }) => {
    seen(id);
    return <p>the exercise</p>;
  },
}));

const { default: ExercisePage } = await import("@/app/trainer/exercises/[id]/page");

afterEach(() => {
  cleanup();
});

describe("an exercise's page", () => {
  it("shows the exercise by its id, with a way back to the library", async () => {
    render(
      <ExercisePage params={Promise.resolve({ id: "e1" })} searchParams={Promise.resolve({})} />
    );
    expect(screen.getByText("the exercise")).toBeDefined();
    expect(await seen.mock.calls[0]?.[0]).toBe("e1");
    expect(screen.getByRole("link", { name: "Takaisin" }).getAttribute("href")).toBe(
      "/valmentaja/harjoitteet"
    );
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const seen = vi.fn();
vi.mock("@/components/notebook", () => ({
  NotebookExerciseView: ({ id }: { id: Promise<string> }) => {
    seen(id);
    return <p>the exercise</p>;
  },
}));

const { default: NotebookExercisePage } = await import("@/app/exercise/[id]/page");

afterEach(() => {
  cleanup();
});

describe("the child's exercise page", () => {
  it("shows the exercise by its block exercise's id", async () => {
    render(
      <NotebookExercisePage
        params={Promise.resolve({ id: "x1" })}
        searchParams={Promise.resolve({})}
      />
    );
    expect(screen.getByText("the exercise")).toBeDefined();
    expect(await seen.mock.calls[0]?.[0]).toBe("x1");
  });
});

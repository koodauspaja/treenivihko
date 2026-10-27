import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/trainer/exercises/actions", () => ({ removeExercise: vi.fn() }));

const { DeleteExercise } = await import("@/components/delete-exercise");

afterEach(() => {
  cleanup();
});

describe("DeleteExercise", () => {
  it("asks before deleting, and Peruuta takes the question back", () => {
    render(<DeleteExercise id="e1" name="Tikkaat" />);
    expect(screen.queryByRole("button", { name: "Poista" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Poista harjoite" }));
    expect(screen.getByText("Poistetaanko harjoite Tikkaat?")).toBeDefined();
    expect((document.querySelector('input[name="id"]') as HTMLInputElement).value).toBe("e1");
    expect(screen.getByRole("button", { name: "Poista" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Peruuta" }));
    expect(screen.queryByText("Poistetaanko harjoite Tikkaat?")).toBeNull();
    expect(screen.getByRole("button", { name: "Poista harjoite" })).toBeDefined();
  });
});

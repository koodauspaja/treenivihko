import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const removeExercise = vi.fn();
vi.mock("@/app/trainer/exercises/actions", () => ({
  removeExercise: (...args: unknown[]) => removeExercise(...args),
}));

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

  it("shows why an exercise a period uses is not deleted", async () => {
    removeExercise.mockResolvedValue({
      version: 1,
      error: "Harjoite on käytössä jaksoissa: 3.11.–16.11.2026. Poista se ensin niiden treeneistä.",
    });
    render(<DeleteExercise id="e1" name="Tikkaat" />);
    fireEvent.click(screen.getByRole("button", { name: "Poista harjoite" }));
    fireEvent.click(screen.getByRole("button", { name: "Poista" }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe(
        "Harjoite on käytössä jaksoissa: 3.11.–16.11.2026. Poista se ensin niiden treeneistä."
      );
    });
  });
});

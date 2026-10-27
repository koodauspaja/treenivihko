import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const requireTrainer = vi.fn();
vi.mock("@/lib/trainer/access", () => ({ requireTrainer: () => requireTrainer() }));
vi.mock("@/components/trainer-timeout", () => ({
  TrainerTimeout: ({ expiresAt }: { expiresAt: string }) => <p>timeout {expiresAt}</p>,
}));
vi.mock("@/components/import-form", () => ({
  ImportPrompt: () => <p>the prompt</p>,
  ImportForm: () => <p>the form</p>,
}));

const { ExerciseImport } = await import("@/components/exercise-import");

afterEach(() => {
  cleanup();
});

describe("ExerciseImport", () => {
  it("shows the introduction, the prompt and the form, behind the unlock", async () => {
    requireTrainer.mockResolvedValue({ user: { id: "u1" }, expiresAt: new Date(0) });
    render(await ExerciseImport());
    expect(screen.getByText(/^Lisää monta harjoitetta kerralla/)).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: "Ohje tekoälylle" })).toBeDefined();
    expect(
      screen.getByText(
        "Kopioi tämä ohje tekoälytyökaluun ja kerro perään, millaisia harjoitteita haluat."
      )
    ).toBeDefined();
    expect(screen.getByText("the prompt")).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: "Tuonti" })).toBeDefined();
    expect(screen.getByText("the form")).toBeDefined();
    expect(screen.getByText(`timeout ${new Date(0).toISOString()}`)).toBeDefined();
  });

  it("needs an unlock", async () => {
    requireTrainer.mockRejectedValue(new Error("redirect /valmentaja/avaa"));
    await expect(ExerciseImport()).rejects.toThrow("redirect /valmentaja/avaa");
  });
});

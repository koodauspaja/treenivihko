import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireTrainer = vi.fn();
const listExercises = vi.fn();
vi.mock("@/lib/trainer/access", () => ({ requireTrainer: () => requireTrainer() }));
vi.mock("@/lib/exercises/store", () => ({
  listExercises: (...args: unknown[]) => listExercises(...args),
}));
vi.mock("@/components/trainer-timeout", () => ({ TrainerTimeout: () => null }));

const { ExerciseLibrary } = await import("@/components/exercise-library");

const exercise = (id: string, name: string, labels: string[], extra = {}) => ({
  id,
  name,
  instructions: "Tee näin.",
  videoUrl: null,
  amountKind: "count",
  amount: 10,
  durationMinutes: 5,
  level: 1,
  warmUp: false,
  labels,
  ...extra,
});

beforeEach(() => {
  requireTrainer.mockReset().mockResolvedValue({
    user: { id: "u1", name: "Test Parent", sessionId: "s1" },
    expiresAt: new Date(),
  });
  listExercises.mockReset();
});

afterEach(() => {
  cleanup();
});

const show = async (query = {}) => render(await ExerciseLibrary({ query: Promise.resolve(query) }));

describe("ExerciseLibrary", () => {
  it("says the library is empty", async () => {
    listExercises.mockResolvedValue([]);
    await show();
    expect(listExercises).toHaveBeenCalledWith("u1");
    expect(screen.getByText("Kirjastossa ei ole vielä harjoitteita.")).toBeDefined();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("lists every exercise in Finnish order, with its count, details and page", async () => {
    listExercises.mockResolvedValue([
      exercise("e2", "Ärrä", ["dribbling", "gym"], {
        amountKind: "time",
        amount: 90,
        level: 3,
        warmUp: true,
      }),
      exercise("e1", "Ankka", ["shooting", "field"]),
    ]);
    await show();
    expect(screen.getByText("2 harjoitetta")).toBeDefined();
    const rows = screen.getAllByRole("listitem");
    expect(rows.map((row) => within(row).getByRole("link").textContent)).toEqual(["Ankka", "Ärrä"]);
    expect(
      within(rows[0] as HTMLElement)
        .getByRole("link")
        .getAttribute("href")
    ).toBe("/valmentaja/harjoitteet/e1");
    expect(screen.getByText("Taso Helppo, 10 kertaa, 5 min")).toBeDefined();
    expect(screen.getByText("Taso Vaikea, 1 min 30 s, 5 min, Lämmittely")).toBeDefined();
  });

  it("shows only what fits the address's filters, ticked as they were", async () => {
    listExercises.mockResolvedValue([
      exercise("e1", "Ankka", ["shooting", "field", "goal"]),
      exercise("e2", "Zeta", ["shooting", "field"]),
    ]);
    await show({ taito: "shooting", rajaus: "1", valineet: ["ball"] });
    expect(screen.getByText("1 harjoite")).toBeDefined();
    expect(screen.getByRole("link", { name: "Zeta" })).toBeDefined();
    expect((screen.getByLabelText("Laukaus") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Maali") as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText("Pallo", { exact: true }) as HTMLInputElement).checked).toBe(
      true
    );
    expect(screen.getByText("Välineet käytössä")).toBeDefined();
  });

  it("says nothing fits when the filters leave nothing", async () => {
    listExercises.mockResolvedValue([exercise("e1", "Ankka", ["shooting", "field"])]);
    await show({ paikka: "gym" });
    expect(screen.getByText("Yksikään harjoite ei sovi valintoihin.")).toBeDefined();
  });

  it("filters with every equipment item ticked when nothing was sent", async () => {
    listExercises.mockResolvedValue([]);
    await show();
    for (const name of ["Pallo", "Tikkaat", "Aidat", "Kartiot", "Maali", "Seinä", "Hyppynaru"]) {
      expect((screen.getByLabelText(name, { exact: true }) as HTMLInputElement).checked).toBe(true);
    }
    expect((screen.getByLabelText("Kuljetus") as HTMLInputElement).checked).toBe(false);
    const sent = document.querySelector('input[name="rajaus"]') as HTMLInputElement;
    expect(sent.value).toBe("1");
  });

  it("shows nothing without an unlock", async () => {
    requireTrainer.mockRejectedValue(new Error("redirect /valmentaja/avaa"));
    await expect(ExerciseLibrary({ query: Promise.resolve({}) })).rejects.toThrow("redirect");
    expect(listExercises).not.toHaveBeenCalled();
  });
});

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_VALUES, type ExerciseValues } from "@/lib/exercises/rules";

const saveExercise = vi.fn();
vi.mock("@/app/trainer/exercises/actions", () => ({
  saveExercise: (...args: unknown[]) => saveExercise(...args),
}));

const { ExerciseForm } = await import("@/components/exercise-form");

const STORED: ExerciseValues = {
  name: "Tikkaat",
  instructions: "Tee näin.",
  videoUrl: "https://example.com/v",
  amountKind: "time",
  count: "",
  seconds: "30",
  durationMinutes: "5",
  level: "2",
  warmUp: true,
  labels: ["footwork", "field"],
};

const field = (label: string) => screen.getByLabelText(label, { exact: true }) as HTMLInputElement;
const save = () => fireEvent.click(screen.getByRole("button", { name: "Tallenna" }));

beforeEach(() => {
  saveExercise.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("ExerciseForm", () => {
  it("starts empty for a new exercise, with a count and no id", () => {
    render(<ExerciseForm initialValues={EMPTY_VALUES} />);
    expect(field("Nimi").value).toBe("");
    expect(field("Kertaa").checked).toBe(true);
    expect(screen.getByLabelText("Kertoja")).toBeDefined();
    expect(screen.queryByLabelText("Sekuntia")).toBeNull();
    expect(document.querySelector('input[name="id"]')).toBeNull();
    for (const label of ["Kuljetus", "Kenttä", "Maali", "Sopii lämmittelyyn", "Helppo"]) {
      expect(field(label).checked).toBe(false);
    }
  });

  it("starts from a stored exercise, its id sent along", () => {
    render(<ExerciseForm exerciseId="e1" initialValues={STORED} />);
    expect(field("Nimi").value).toBe("Tikkaat");
    expect(field("Ohje").value).toBe("Tee näin.");
    expect(field("Videolinkki").value).toBe("https://example.com/v");
    expect(field("Videolinkki").type).toBe("text");
    expect(field("Aika").checked).toBe(true);
    expect(field("Sekuntia").value).toBe("30");
    expect(field("Kesto (min)").value).toBe("5");
    expect(field("Keskitaso").checked).toBe(true);
    expect(field("Sopii lämmittelyyn").checked).toBe(true);
    expect(field("Jalkatyö").checked).toBe(true);
    expect(field("Kenttä").checked).toBe(true);
    expect(field("Kuljetus").checked).toBe(false);
    expect((document.querySelector('input[name="id"]') as HTMLInputElement).value).toBe("e1");
  });

  it("shows only the chosen amount's field", () => {
    render(<ExerciseForm initialValues={EMPTY_VALUES} />);
    fireEvent.click(field("Aika"));
    expect(screen.getByLabelText("Sekuntia")).toBeDefined();
    expect(screen.queryByLabelText("Kertoja")).toBeNull();
    fireEvent.click(field("Kertaa"));
    expect(screen.getByLabelText("Kertoja")).toBeDefined();
  });

  it("shows each refusal beside its field, and what was typed", async () => {
    saveExercise.mockResolvedValue({
      version: 1,
      message: null,
      errors: {
        name: "Nimessä on oltava 1–40 merkkiä.",
        instructions: "Ohjeessa on oltava 1–1000 merkkiä.",
        videoUrl: "Videolinkin on oltava https-osoite.",
        time: "Ajan on oltava 5 s – 10 min, 5 sekunnin välein.",
        duration: "Keston on oltava 1–30 minuuttia.",
        level: "Valitse taso.",
        skill: "Valitse vähintään yksi taito.",
        place: "Valitse vähintään yksi paikka.",
      },
      values: { ...EMPTY_VALUES, amountKind: "time", seconds: "7", instructions: "typed" },
    });
    render(<ExerciseForm initialValues={EMPTY_VALUES} />);
    save();
    await waitFor(() => {
      expect(screen.getAllByRole("alert")).toHaveLength(8);
    });
    expect(field("Ohje").value).toBe("typed");
    expect(field("Sekuntia").value).toBe("7");
  });

  it("shows a count's refusal, and the action's message", async () => {
    saveExercise.mockResolvedValue({
      version: 1,
      message: "Lisätty: Tikkaat.",
      errors: { count: "Kertoja on oltava 1–100." },
      values: EMPTY_VALUES,
    });
    render(<ExerciseForm initialValues={STORED} />);
    save();
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe("Lisätty: Tikkaat.");
    });
    expect(screen.getByRole("alert").textContent).toBe("Kertoja on oltava 1–100.");
    expect(field("Nimi").value).toBe("");
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireTrainer = vi.fn();
const getExercise = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("not found");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));
vi.mock("@/lib/trainer/access", () => ({ requireTrainer: () => requireTrainer() }));
vi.mock("@/lib/exercises/store", () => ({
  getExercise: (...args: unknown[]) => getExercise(...args),
}));
vi.mock("@/components/trainer-timeout", () => ({ TrainerTimeout: () => <p>timeout</p> }));
vi.mock("@/components/exercise-form", () => ({
  ExerciseForm: ({
    exerciseId,
    revision,
    initialValues,
  }: {
    exerciseId?: string;
    revision?: number;
    initialValues: { name: string };
  }) => (
    <p>
      form {String(exerciseId)} {String(revision)} {initialValues.name || "(empty)"}
    </p>
  ),
}));
vi.mock("@/components/delete-exercise", () => ({
  DeleteExercise: ({ id, name }: { id: string; name: string }) => (
    <p>
      delete {id} {name}
    </p>
  ),
}));

const { ExistingExercise, NewExercise } = await import("@/components/exercise-editor");

const STORED = {
  id: "e1",
  name: "Tikkaat",
  instructions: "Tee näin.",
  videoUrl: "https://example.com/v",
  amountKind: "count",
  amount: 10,
  durationMinutes: 5,
  level: 1,
  warmUp: false,
  labels: ["footwork", "field"],
  revision: 3,
};

beforeEach(() => {
  requireTrainer.mockReset().mockResolvedValue({
    user: { id: "u1", name: "Test Parent", sessionId: "s1" },
    expiresAt: new Date(),
  });
  getExercise.mockReset();
  notFound.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("NewExercise", () => {
  it("is an empty form behind the unlock", async () => {
    render(await NewExercise());
    expect(screen.getByText("form undefined undefined (empty)")).toBeDefined();
    expect(screen.getByText("timeout")).toBeDefined();
  });
});

describe("ExistingExercise", () => {
  it("shows the parent's exercise: its name, its video in a new tab, its form and its deletion", async () => {
    getExercise.mockResolvedValue(STORED);
    render(await ExistingExercise({ id: Promise.resolve("e1") }));
    expect(getExercise).toHaveBeenCalledWith("u1", "e1");
    expect(screen.getByRole("heading", { level: 1, name: "Tikkaat" })).toBeDefined();
    const video = screen.getByRole("link", { name: "Katso video" });
    expect(video.getAttribute("href")).toBe("https://example.com/v");
    expect(video.getAttribute("target")).toBe("_blank");
    expect(video.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByText("form e1 3 Tikkaat")).toBeDefined();
    expect(screen.getByText("delete e1 Tikkaat")).toBeDefined();
  });

  it("shows no video link without one", async () => {
    getExercise.mockResolvedValue({ ...STORED, videoUrl: null });
    render(await ExistingExercise({ id: Promise.resolve("e1") }));
    expect(screen.queryByRole("link", { name: "Katso video" })).toBeNull();
  });

  it("is not found when it is not the parent's, or gone", async () => {
    getExercise.mockResolvedValue(null);
    await expect(ExistingExercise({ id: Promise.resolve("other") })).rejects.toThrow("not found");
  });
});

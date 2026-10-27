"use server";

/**
 * The library's actions. Each is reachable by a direct POST, so each checks
 * the unlock itself, and the store keeps every read and write to the parent's
 * own exercises.
 *
 * decisions/f002-exercise-library.md
 */

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { added, REFUSAL, SAVED } from "@/lib/exercises/messages";
import {
  EMPTY_VALUES,
  type ExerciseField,
  type ExerciseValues,
  readExercise,
  valuesFrom,
  valuesOf,
} from "@/lib/exercises/rules";
import { createExercise, deleteExercise, updateExercise } from "@/lib/exercises/store";
import { requireTrainer } from "@/lib/trainer/access";
import { EXERCISES_PATH } from "@/lib/trainer/paths";

export type ExerciseFormState = {
  // Changes on every answer, so the form starts again from `values`.
  version: number;
  message: string | null;
  errors: Partial<Record<ExerciseField, string>>;
  values: ExerciseValues;
};

const NOT_FOUND = "Sivua ei löytynyt.";

/** Adds or saves an exercise, or shows why not beside each field. */
export async function saveExercise(
  previous: ExerciseFormState,
  form: FormData
): Promise<ExerciseFormState> {
  const { user } = await requireTrainer();
  const values = valuesOf(form);
  const version = previous.version + 1;
  const reading = readExercise(values);
  if (!reading.ok) {
    return { version, message: null, errors: reading.errors, values };
  }
  const id = form.get("id");
  const result =
    typeof id === "string" && id !== ""
      ? await updateExercise(user.id, id, reading.exercise)
      : await createExercise(user.id, reading.exercise);
  if (result.kind === "nameInUse") {
    return { version, message: null, errors: { name: REFUSAL.nameInUse }, values };
  }
  if (result.kind === "missing") {
    return { version, message: NOT_FOUND, errors: {}, values };
  }
  if (typeof id === "string" && id !== "") {
    refresh();
    // As saved, trimmed and tidied, not as typed.
    return { version, message: SAVED, errors: {}, values: valuesFrom(reading.exercise) };
  }
  return { version, message: added(reading.exercise.name), errors: {}, values: EMPTY_VALUES };
}

/** Deletes an exercise, then shows the library. */
export async function removeExercise(form: FormData): Promise<void> {
  const { user } = await requireTrainer();
  const id = form.get("id");
  if (typeof id === "string" && id !== "") {
    await deleteExercise(user.id, id);
  }
  redirect(EXERCISES_PATH);
}

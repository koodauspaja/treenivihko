"use server";

/**
 * The library's actions. Each is reachable by a direct POST, so each checks
 * the unlock itself, and the store keeps every read and write to the parent's
 * own exercises.
 *
 * decisions/f002-exercise-library.md
 * decisions/f004-periods-and-sessions.md
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
import { type ActionState, formText } from "@/lib/forms";
import { NOT_FOUND } from "@/lib/messages";
import { spanOf } from "@/lib/periods/dates";
import { exerciseInUse } from "@/lib/periods/messages";
import { requireTrainer } from "@/lib/trainer/access";
import { EXERCISES_PATH } from "@/lib/trainer/paths";

export type ExerciseFormState = {
  // Changes on every answer, so the form starts again from `values`.
  version: number;
  message: string | null;
  errors: Partial<Record<ExerciseField, string>>;
  values: ExerciseValues;
};

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

/** Deletes an exercise, then shows the library; or says which periods use it. */
export async function removeExercise(previous: ActionState, form: FormData): Promise<ActionState> {
  const { user } = await requireTrainer();
  const result = await deleteExercise(user.id, formText(form, "id"));
  if (result.kind === "inUse") {
    return { version: previous.version + 1, error: exerciseInUse(result.periods.map(spanOf)) };
  }
  redirect(EXERCISES_PATH);
}

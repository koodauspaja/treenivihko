"use server";

/**
 * The library's actions. Each is reachable by a direct POST, so each checks
 * the unlock itself, and the store keeps every read and write to the parent's
 * own exercises.
 *
 * decisions/f002-exercise-library.md
 * decisions/f004-periods-and-sessions.md
 * decisions/f010-exercise-saved-meanwhile.md
 */

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { added, CHANGED_MEANWHILE, REFUSAL, SAVED } from "@/lib/exercises/messages";
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
  // A save refused as changed meanwhile: the revision it found, which `Tallenna silti` saves over.
  changed?: { revision: number };
  // The revision `values` belong to: the one sent, after a refusal; the one reached, after a save.
  revision?: number;
};

const REVISION_MAX = 2_147_483_647;

/** A form's revision as a whole number within Postgres's integer, or 0, which no exercise is at. */
const revisionOf = (form: FormData, name: string) => {
  const value = formText(form, name);
  const revision = /^[1-9]\d{0,9}$/.test(value) ? Number(value) : 0;
  return revision <= REVISION_MAX ? revision : 0;
};

/** Adds or saves an exercise, or shows why not beside each field. */
export async function saveExercise(
  previous: ExerciseFormState,
  form: FormData
): Promise<ExerciseFormState> {
  const { user } = await requireTrainer();
  const values = valuesOf(form);
  const version = previous.version + 1;
  const id = form.get("id");
  const existing = typeof id === "string" && id !== "";
  // An existing exercise's refusal keeps the revision its form was at, beside what was typed.
  const revision = revisionOf(form, "revision");
  const sent = existing ? { revision } : {};
  const reading = readExercise(values);
  if (!reading.ok) {
    return { version, message: null, errors: reading.errors, values, ...sent };
  }
  if (!existing) {
    const result = await createExercise(user.id, reading.exercise);
    if (result.kind === "nameInUse") {
      return { version, message: null, errors: { name: REFUSAL.nameInUse }, values };
    }
    return { version, message: added(reading.exercise.name), errors: {}, values: EMPTY_VALUES };
  }
  // `Tallenna silti` sends the revision the refusal found as `over`; `Tallenna`, the form's as `revision`.
  const over = form.has("over");
  const result = await updateExercise(user.id, id, reading.exercise, {
    revision: over ? revisionOf(form, "over") : revision,
    over,
  });
  if (result.kind === "changed") {
    return {
      version,
      message: CHANGED_MEANWHILE,
      errors: {},
      values,
      changed: { revision: result.revision },
      ...sent,
    };
  }
  if (result.kind === "nameInUse") {
    return { version, message: null, errors: { name: REFUSAL.nameInUse }, values, ...sent };
  }
  if (result.kind === "missing") {
    return { version, message: NOT_FOUND, errors: {}, values, ...sent };
  }
  refresh();
  // As saved, trimmed and tidied, not as typed, with the revision the save reached: the refreshed
  // page may already pass a later one, from another save these values do not show.
  return {
    version,
    message: SAVED,
    errors: {},
    values: valuesFrom(reading.exercise),
    revision: result.revision,
  };
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

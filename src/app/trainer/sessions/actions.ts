"use server";

/**
 * A session's actions, and its blocks' and their exercises'. Each is
 * reachable by a direct POST, so each checks the unlock itself, and the store
 * keeps every write to the parent's own.
 *
 * decisions/f001-trainer-side.md
 * decisions/f002-exercise-library.md
 * decisions/f004-periods-and-sessions.md
 */

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionState, formText as text } from "@/lib/forms";
import { NOT_FOUND } from "@/lib/messages";
import { REFUSAL, SAVED } from "@/lib/periods/messages";
import { readBlockAmount, readSessionSettings, readTheme } from "@/lib/periods/rules";
import {
  addBlock,
  addBlockExercise,
  blockExerciseKind,
  type Direction,
  deleteBlock,
  deleteBlockExercise,
  deleteSession,
  moveBlock,
  moveBlockExercise,
  updateBlockExerciseAmount,
  updateBlockTheme,
  updateSessionSettings,
} from "@/lib/periods/store";
import { requireTrainer } from "@/lib/trainer/access";
import { PERIODS_PATH, periodPath, sessionPath } from "@/lib/trainer/paths";

export type FieldState = {
  // Changes on every answer, so the form starts again from what it holds.
  version: number;
  message: string | null;
  errors: Partial<Record<string, string>>;
};

const direction = (form: FormData): Direction => (text(form, "direction") === "up" ? "up" : "down");

const answer = (previous: FieldState, change: Omit<FieldState, "version">): FieldState => ({
  version: previous.version + 1,
  ...change,
});

/** Saves a session's place, equipment and target, or shows why not. */
export async function saveSessionSettings(
  previous: FieldState,
  form: FormData
): Promise<FieldState> {
  const { user } = await requireTrainer();
  const reading = readSessionSettings(
    text(form, "place"),
    form.getAll("equipment").filter((value): value is string => typeof value === "string"),
    text(form, "targetMinutes")
  );
  if (!reading.ok) {
    return answer(previous, { message: null, errors: reading.errors });
  }
  const result = await updateSessionSettings(user.id, text(form, "id"), reading.settings);
  if (result.kind !== "saved") {
    return answer(previous, { message: NOT_FOUND, errors: {} });
  }
  refresh();
  return answer(previous, { message: SAVED, errors: {} });
}

/** Deletes a session, then shows its period. */
export async function removeSession(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { user } = await requireTrainer();
  const periodId = await deleteSession(user.id, text(form, "id"));
  redirect(periodId === null ? PERIODS_PATH : periodPath(periodId));
}

/** Adds a block at the end of a session, or shows why not. */
export async function addBlockFromForm(previous: FieldState, form: FormData): Promise<FieldState> {
  const { user } = await requireTrainer();
  const theme = readTheme(text(form, "theme"));
  if (theme === null) {
    return answer(previous, { message: null, errors: { theme: REFUSAL.theme } });
  }
  const result = await addBlock(user.id, text(form, "sessionId"), theme);
  if (result.kind === "limit") {
    return answer(previous, { message: null, errors: { theme: REFUSAL.blocks } });
  }
  if (result.kind === "missing") {
    return answer(previous, { message: NOT_FOUND, errors: {} });
  }
  refresh();
  return answer(previous, { message: null, errors: {} });
}

/** Renames a block, or shows why not. */
export async function saveBlockTheme(previous: FieldState, form: FormData): Promise<FieldState> {
  const { user } = await requireTrainer();
  const theme = readTheme(text(form, "theme"));
  if (theme === null) {
    return answer(previous, { message: null, errors: { theme: REFUSAL.theme } });
  }
  if ((await updateBlockTheme(user.id, text(form, "id"), theme)) === null) {
    return answer(previous, { message: NOT_FOUND, errors: {} });
  }
  refresh();
  return answer(previous, { message: SAVED, errors: {} });
}

/** Moves a block up or down in its session. */
export async function moveBlockFromForm(form: FormData): Promise<void> {
  const { user } = await requireTrainer();
  await moveBlock(user.id, text(form, "id"), direction(form));
  refresh();
}

/** Deletes a block. */
export async function removeBlock(previous: ActionState, form: FormData): Promise<ActionState> {
  const { user } = await requireTrainer();
  await deleteBlock(user.id, text(form, "id"));
  refresh();
  return { version: previous.version + 1, error: null };
}

/** Adds a library exercise at the end of a block, then shows the session; or says why not. */
export async function addBlockExerciseFromForm(
  previous: ActionState,
  form: FormData
): Promise<ActionState> {
  const { user } = await requireTrainer();
  const result = await addBlockExercise(user.id, text(form, "blockId"), text(form, "exerciseId"));
  if (result.kind !== "saved") {
    return {
      version: previous.version + 1,
      error: result.kind === "limit" ? REFUSAL.blockExercises : NOT_FOUND,
    };
  }
  redirect(sessionPath(result.sessionId));
}

/** Saves a block exercise's amount by its kind's rule, or shows why not. */
export async function saveBlockAmount(previous: FieldState, form: FormData): Promise<FieldState> {
  const { user } = await requireTrainer();
  const id = text(form, "id");
  const kind = await blockExerciseKind(user.id, id);
  if (kind === null) {
    return answer(previous, { message: NOT_FOUND, errors: {} });
  }
  const reading = readBlockAmount(kind, text(form, "amount"));
  if (!reading.ok) {
    return answer(previous, { message: null, errors: { amount: reading.error } });
  }
  if ((await updateBlockExerciseAmount(user.id, id, reading.amount)) === null) {
    return answer(previous, { message: NOT_FOUND, errors: {} });
  }
  refresh();
  return answer(previous, { message: SAVED, errors: {} });
}

/** Moves a block exercise up or down in its block. */
export async function moveBlockExerciseFromForm(form: FormData): Promise<void> {
  const { user } = await requireTrainer();
  await moveBlockExercise(user.id, text(form, "id"), direction(form));
  refresh();
}

/** Takes an exercise out of its block. */
export async function removeBlockExercise(form: FormData): Promise<void> {
  const { user } = await requireTrainer();
  await deleteBlockExercise(user.id, text(form, "id"));
  refresh();
}

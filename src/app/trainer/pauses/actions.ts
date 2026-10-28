"use server";

/**
 * The pauses' actions. Each is reachable by a direct POST, so each checks
 * the unlock itself, and the store keeps every write to the parent's own.
 *
 * decisions/f001-trainer-side.md
 * decisions/f008-streaks-and-accomplishments.md
 */

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionState, formText as text } from "@/lib/forms";
import { NOT_FOUND } from "@/lib/messages";
import { pauseOverlapsWith, pauseSpan } from "@/lib/streaks/messages";
import { readPause } from "@/lib/streaks/rules";
import { createPause, deletePause } from "@/lib/streaks/store";
import { requireTrainer } from "@/lib/trainer/access";
import { PAUSES_PATH } from "@/lib/trainer/paths";

export type PauseFormState = {
  // Changes on every answer, so the form starts again: from `values` when refused, else afresh.
  version: number;
  errors: Partial<Record<"startsOn" | "endsOn", string>>;
  values: { startsOn: string; endsOn: string };
};

/** Adds a pause, then shows it in the list; or shows why not. */
export async function createPauseFromForm(
  previous: PauseFormState,
  form: FormData
): Promise<PauseFormState> {
  const { user } = await requireTrainer();
  const values = { startsOn: text(form, "startsOn"), endsOn: text(form, "endsOn") };
  const version = previous.version + 1;
  const reading = readPause(values.startsOn, values.endsOn);
  if (!reading.ok) {
    return { version, errors: reading.errors, values };
  }
  const result = await createPause(user.id, reading.pause);
  if (result.kind === "overlap") {
    return { version, errors: { startsOn: pauseOverlapsWith(pauseSpan(result.with)) }, values };
  }
  if (result.kind === "missing") {
    return { version, errors: { startsOn: NOT_FOUND }, values };
  }
  refresh();
  return { version, errors: {}, values };
}

/** Deletes a pause, then shows the pauses. */
export async function removePause(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { user } = await requireTrainer();
  await deletePause(user.id, text(form, "id"));
  redirect(PAUSES_PATH);
}

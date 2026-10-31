"use server";

/**
 * The periods' actions. Each is reachable by a direct POST, so each checks
 * the unlock itself, and the store keeps every write to the parent's own.
 *
 * decisions/f001-trainer-side.md
 * decisions/f004-periods-and-sessions.md
 * decisions/f009-adapted-period.md
 */

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionState, formText as text } from "@/lib/forms";
import { NOT_FOUND } from "@/lib/messages";
import { spanOf } from "@/lib/periods/dates";
import { changeLine, overlapsWith, REFUSAL, SAVED } from "@/lib/periods/messages";
import { readPeriodDates } from "@/lib/periods/rules";
import {
  addSession,
  createAdaptedPeriod,
  createPeriod,
  deletePeriod,
  type PeriodWrite,
  updatePeriodDates,
} from "@/lib/periods/store";
import { requireTrainer } from "@/lib/trainer/access";
import { PERIODS_PATH, periodPath, sessionPath } from "@/lib/trainer/paths";

export type PeriodFormState = {
  // Changes on every answer, so the form starts again: from `values` when
  // refused against the page's dates, otherwise from the page's dates.
  version: number;
  message: string | null;
  errors: Partial<Record<"startsOn" | "weeks", string>>;
  values: { startsOn: string; weeks: string };
  // An adapted copy, shown once in place of the form: its span, id and changes' lines.
  created?: { id: string; span: string; changes: { id: string; line: string }[] };
};

/** A refused write's reason, beside the start's field. */
const refusalOf = (result: Exclude<PeriodWrite, { kind: "saved" }>): PeriodFormState["errors"] => {
  if (result.kind === "missing") {
    return { startsOn: NOT_FOUND };
  }
  return { startsOn: overlapsWith(spanOf(result.with)) };
};

/**
 * Adds a period as a copy of the latest, then shows it; adapted to its marks
 * when the choice is checked, then shows what changed; or shows why not.
 */
export async function createPeriodFromForm(
  previous: PeriodFormState,
  form: FormData
): Promise<PeriodFormState> {
  const { user } = await requireTrainer();
  const values = { startsOn: text(form, "startsOn"), weeks: text(form, "weeks") };
  const version = previous.version + 1;
  const reading = readPeriodDates(values.startsOn, values.weeks);
  if (!reading.ok) {
    return { version, message: null, errors: reading.errors, values };
  }
  if (form.get("adapt") === "on") {
    const adapted = await createAdaptedPeriod(user.id, reading.dates);
    if (adapted.kind !== "saved") {
      return { version, message: null, errors: refusalOf(adapted), values };
    }
    const span = spanOf(reading.dates);
    return {
      version,
      message: null,
      errors: {},
      values,
      created: {
        id: adapted.id,
        span,
        changes: adapted.changes.map((change) => ({ id: change.id, line: changeLine(change) })),
      },
    };
  }
  const result = await createPeriod(user.id, reading.dates);
  if (result.kind !== "saved") {
    return { version, message: null, errors: refusalOf(result), values };
  }
  redirect(periodPath(result.id));
}

/** Saves a period's dates, or shows why not. */
export async function savePeriodDates(
  previous: PeriodFormState,
  form: FormData
): Promise<PeriodFormState> {
  const { user } = await requireTrainer();
  const values = { startsOn: text(form, "startsOn"), weeks: text(form, "weeks") };
  const version = previous.version + 1;
  const reading = readPeriodDates(values.startsOn, values.weeks);
  if (!reading.ok) {
    return { version, message: null, errors: reading.errors, values };
  }
  const result = await updatePeriodDates(user.id, text(form, "id"), reading.dates);
  if (result.kind !== "saved") {
    return { version, message: null, errors: refusalOf(result), values };
  }
  refresh();
  return { version, message: SAVED, errors: {}, values };
}

/** Deletes a period and its sessions, then shows the periods. */
export async function removePeriod(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { user } = await requireTrainer();
  await deletePeriod(user.id, text(form, "id"));
  redirect(PERIODS_PATH);
}

/** Adds a session at the end of a period, then shows it; or says why not. */
export async function addSessionFromForm(
  previous: ActionState,
  form: FormData
): Promise<ActionState> {
  const { user } = await requireTrainer();
  const version = previous.version + 1;
  const result = await addSession(user.id, text(form, "periodId"));
  if (result.kind === "limit") {
    return { version, error: REFUSAL.sessions };
  }
  if (result.kind === "missing") {
    return { version, error: NOT_FOUND };
  }
  redirect(sessionPath(result.id));
}

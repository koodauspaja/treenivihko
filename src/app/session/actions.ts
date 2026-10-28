"use server";

/**
 * A session's mark, saved and removed on the child's side. Each is reachable
 * by a direct POST, so each checks the sign-in itself, and the store keeps
 * every write to the parent's own sessions in a period the child may mark.
 *
 * decisions/029-sign-in.md
 * decisions/f006-session-marks.md
 */

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { SIGNED_IN_PATH } from "@/lib/auth/paths";
import { requireUser } from "@/lib/auth/session";
import { type ActionState, formText as text } from "@/lib/forms";
import { REFUSAL } from "@/lib/marks/messages";
import { PICKS, type PickKey, readMark } from "@/lib/marks/rules";
import { deleteMark, saveMark } from "@/lib/marks/store";
import { NOT_FOUND } from "@/lib/messages";
import { today } from "@/lib/periods/dates";

export type MarkState = {
  // Changes on every answer, so the form starts again from what it holds.
  version: number;
  message: string | null;
  errors: Partial<Record<"status" | "trainedOn" | "picks", string>>;
};

const answer = (previous: MarkState, change: Omit<MarkState, "version">): MarkState => ({
  version: previous.version + 1,
  ...change,
});

/** Saves a session's mark, then shows the child's side; or shows why not. */
export async function saveMarkFromForm(previous: MarkState, form: FormData): Promise<MarkState> {
  const user = await requireUser();
  const day = today();
  const picks = Object.fromEntries(PICKS.map((pick) => [pick, text(form, pick)])) as Record<
    PickKey,
    string
  >;
  const reading = readMark(
    {
      status: text(form, "status"),
      trainedOn: text(form, "trainedOn"),
      feeling: text(form, "feeling"),
      picks,
    },
    day
  );
  if (!reading.ok) {
    return answer(previous, { message: null, errors: reading.errors });
  }
  const result = await saveMark(user.id, text(form, "id"), reading.mark, day);
  if (result.kind === "missing") {
    return answer(previous, { message: NOT_FOUND, errors: {} });
  }
  if (result.kind === "early") {
    return answer(previous, { message: null, errors: { trainedOn: REFUSAL.outOfRange } });
  }
  if (result.kind === "stale") {
    refresh();
    return answer(previous, { message: null, errors: { picks: REFUSAL.stale } });
  }
  redirect(SIGNED_IN_PATH);
}

/** Removes a session's mark, then shows the child's side; or says the session is gone. */
export async function removeMark(previous: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if ((await deleteMark(user.id, text(form, "id"), today())) === "missing") {
    return { version: previous.version + 1, error: NOT_FOUND };
  }
  redirect(SIGNED_IN_PATH);
}

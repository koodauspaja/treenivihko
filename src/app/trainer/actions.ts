"use server";

/**
 * The trainer side's actions. Each is reachable by a direct POST, so each
 * checks the user, and the unlock where it needs one, itself.
 *
 * decisions/f001-trainer-side.md
 */

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { SIGNED_IN_PATH } from "@/lib/auth/paths";
import { requireUser } from "@/lib/auth/session";
import { requireTrainer } from "@/lib/trainer/access";
import { NICKNAME_REFUSED, refusalMessage, SAVED } from "@/lib/trainer/messages";
import { TRAINER_PATH } from "@/lib/trainer/paths";
import { nicknameFrom } from "@/lib/trainer/rules";
import { lockTrainer, saveNickname, tryPassword } from "@/lib/trainer/store";

/** What a form shows after its action: a message, and whether it is an error. */
export type FormState = { message: string; error: boolean } | null;

/** Opens the trainer side with the password, or says why not. */
export async function unlockTrainer(_previous: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const password = form.get("password");
  const now = new Date();
  const result = await tryPassword(
    {
      userId: user.id,
      sessionId: user.sessionId,
      password: typeof password === "string" ? password : "",
    },
    now
  );
  if (result.kind === "unlocked") {
    redirect(TRAINER_PATH);
  }
  return { message: refusalMessage(result, now), error: true };
}

/** Saves the child's nickname, trimmed, or refuses one of the wrong length. */
export async function saveChildNickname(_previous: FormState, form: FormData): Promise<FormState> {
  const { user } = await requireTrainer();
  const nickname = nicknameFrom(form.get("nickname"));
  if (nickname === null) {
    return { message: NICKNAME_REFUSED, error: true };
  }
  await saveNickname(user.id, nickname);
  refresh();
  return { message: SAVED, error: false };
}

/** Locks the trainer side and returns to the child's side. */
export async function lockTrainerSide(): Promise<void> {
  const user = await requireUser();
  await lockTrainer(user.id, user.sessionId);
  redirect(SIGNED_IN_PATH);
}

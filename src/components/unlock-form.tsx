"use client";

import { useActionState } from "react";
import { type FormState, unlockTrainer } from "@/app/trainer/actions";
import { PASSWORD_LABEL, UNLOCK_BUTTON } from "@/lib/trainer/messages";

/** The trainer side's password, and why the last one did not open it. decisions/f001-trainer-side.md */
export function UnlockForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(unlockTrainer, null);
  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      <label htmlFor="trainer-password">{PASSWORD_LABEL}</label>
      <input
        id="trainer-password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        className="rounded border px-3 py-2"
      />
      {state === null ? null : (
        <p role="alert" className="text-red-700">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {UNLOCK_BUTTON}
      </button>
    </form>
  );
}

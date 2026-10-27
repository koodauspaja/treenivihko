"use client";

import { useActionState } from "react";
import { type FormState, saveChildNickname } from "@/app/trainer/actions";
import { NICKNAME_LABEL, SAVE_BUTTON } from "@/lib/trainer/messages";

/** The child's nickname, as the greeting shows it. decisions/f001-trainer-side.md */
export function NicknameForm({ nickname }: Readonly<{ nickname: string | null }>) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveChildNickname, null);
  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      <label htmlFor="child-nickname">{NICKNAME_LABEL}</label>
      <input
        id="child-nickname"
        name="nickname"
        defaultValue={nickname ?? ""}
        className="rounded border px-3 py-2"
      />
      {state === null ? null : (
        <p role={state.error ? "alert" : "status"} className={state.error ? "text-red-700" : ""}>
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {SAVE_BUTTON}
      </button>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { type ActionState, NO_ANSWER } from "@/lib/forms";
import { CANCEL, DELETE } from "@/lib/messages";

/**
 * A button that asks before it acts, with Poista and Peruuta, and shows the
 * action's refusal when it has one. decisions/f004-periods-and-sessions.md
 */
export function ConfirmAction({
  action,
  fields,
  label,
  question,
}: Readonly<{
  action: (previous: ActionState, form: FormData) => Promise<ActionState>;
  fields: Readonly<Record<string, string>>;
  label: string;
  question: string;
}>) {
  const [asking, setAsking] = useState(false);
  const [state, act, pending] = useActionState(action, NO_ANSWER);
  const refusal =
    state.error === null ? null : (
      <p role="alert" className="text-red-700">
        {state.error}
      </p>
    );
  if (!asking) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="self-start rounded border px-4 py-2"
        >
          {label}
        </button>
        {refusal}
      </div>
    );
  }
  return (
    <form action={act} className="flex flex-col gap-3">
      <p>{question}</p>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-red-700 px-4 py-2 text-white"
        >
          {DELETE}
        </button>
        <button type="button" onClick={() => setAsking(false)} className="rounded border px-4 py-2">
          {CANCEL}
        </button>
      </div>
      {refusal}
    </form>
  );
}

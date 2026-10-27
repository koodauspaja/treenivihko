"use client";

import { useActionState } from "react";
import { type ActionState, NO_ANSWER } from "@/lib/forms";

/** One button that sends its fields, and shows the action's refusal beside it. decisions/f004-periods-and-sessions.md */
export function ActionButton({
  action,
  fields,
  label,
}: Readonly<{
  action: (previous: ActionState, form: FormData) => Promise<ActionState>;
  fields: Readonly<Record<string, string>>;
  label: string;
}>) {
  const [state, act, pending] = useActionState(action, NO_ANSWER);
  return (
    <form action={act} className="flex flex-col gap-2">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" disabled={pending} className="self-start rounded border px-4 py-2">
        {label}
      </button>
      {state.error === null ? null : (
        <p role="alert" className="text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}

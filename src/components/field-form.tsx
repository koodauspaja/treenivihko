"use client";

import { useActionState, useState } from "react";
import type { FieldState } from "@/app/trainer/sessions/actions";
import { formText } from "@/lib/forms";
import { SAVE } from "@/lib/periods/messages";

const START: FieldState = { version: 0, message: null, errors: {} };

/**
 * One field and its button, such as a block's theme or an exercise's amount:
 * its refusal beside it with what was typed kept, and its message after
 * saving; then the field shows `initial` again, as the page now has it, and
 * again whenever the page brings a newer one. decisions/f004-periods-and-sessions.md
 */
export function FieldForm({
  action,
  fields,
  name,
  label,
  initial,
  button = SAVE,
  inputMode,
}: Readonly<{
  action: (previous: FieldState, form: FormData) => Promise<FieldState>;
  fields: Readonly<Record<string, string>>;
  name: string;
  label: string;
  initial: string;
  button?: string;
  inputMode?: "numeric";
}>) {
  const [state, act, pending] = useActionState(action, START);
  // React empties a form after its action, so a refused value is put back from here.
  const [typed, setTyped] = useState(initial);
  const error = state.errors[name];
  const shown = error === undefined ? initial : typed;
  const id = `${name}-${Object.values(fields).join("-")}`;
  const submit = (form: FormData) => {
    setTyped(formText(form, name));
    act(form);
  };
  return (
    <form action={submit} className="flex flex-wrap items-end gap-2">
      {Object.entries(fields).map(([field, value]) => (
        <input key={field} type="hidden" name={field} value={value} />
      ))}
      <div className="flex flex-col gap-1">
        <label htmlFor={id}>{label}</label>
        <input
          key={`${state.version}|${initial}`}
          id={id}
          name={name}
          defaultValue={shown}
          inputMode={inputMode}
          className="rounded border px-3 py-2"
        />
      </div>
      <button type="submit" disabled={pending} className="rounded border px-4 py-2">
        {button}
      </button>
      {error === undefined ? null : (
        <p role="alert" className="w-full text-red-700">
          {error}
        </p>
      )}
      {state.message === null ? null : <output className="w-full">{state.message}</output>}
    </form>
  );
}

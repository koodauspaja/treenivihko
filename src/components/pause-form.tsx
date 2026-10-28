"use client";

import { useActionState } from "react";
import { createPauseFromForm, type PauseFormState } from "@/app/trainer/pauses/actions";
import { Refusal } from "@/components/refusal";
import { ADD_PAUSE, FIELD } from "@/lib/streaks/messages";

/**
 * A new pause's first and last day. What was sent is kept when refused;
 * after an add, the form starts again from the page's days.
 * decisions/f008-streaks-and-accomplishments.md
 */
export function PauseForm({
  initial,
}: Readonly<{ initial: { startsOn: string; endsOn: string } }>) {
  const [state, action, pending] = useActionState(createPauseFromForm, {
    version: 0,
    errors: {},
    values: initial,
  } satisfies PauseFormState);
  const shown = Object.keys(state.errors).length === 0 ? initial : state.values;
  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      <div key={state.version} className="flex flex-col gap-3">
        <label htmlFor="pause-start">{FIELD.startsOn}</label>
        <input
          id="pause-start"
          name="startsOn"
          type="date"
          defaultValue={shown.startsOn}
          className="self-start rounded border px-3 py-2"
        />
        <Refusal message={state.errors.startsOn} />
        <label htmlFor="pause-end">{FIELD.endsOn}</label>
        <input
          id="pause-end"
          name="endsOn"
          type="date"
          defaultValue={shown.endsOn}
          className="self-start rounded border px-3 py-2"
        />
        <Refusal message={state.errors.endsOn} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {ADD_PAUSE}
      </button>
    </form>
  );
}

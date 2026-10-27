"use client";

import { useActionState, useState } from "react";
import { type FieldState, saveSessionSettings } from "@/app/trainer/sessions/actions";
import { Refusal } from "@/components/refusal";
import { type LabelKey, labelsIn } from "@/lib/exercises/labels";
import { FIELD, SAVE } from "@/lib/periods/messages";

const START: FieldState = { version: 0, message: null, errors: {} };

/**
 * A session's place, equipment at hand and target length, with what was
 * chosen kept when refused. decisions/f004-periods-and-sessions.md
 */
export function SessionSettingsForm({
  sessionId,
  place,
  equipment,
  targetMinutes,
}: Readonly<{
  sessionId: string;
  place: LabelKey;
  equipment: readonly LabelKey[];
  targetMinutes: number;
}>) {
  const [state, act, pending] = useActionState(saveSessionSettings, START);
  const saved = {
    place: place as string,
    equipment: equipment as readonly string[],
    target: String(targetMinutes),
  };
  // React empties a form after its action, so refused choices are put back from here.
  const [typed, setTyped] = useState(saved);
  const shown = Object.keys(state.errors).length === 0 ? saved : typed;
  const submit = (form: FormData) => {
    // Every field here is text; only the place can be missing, when none is chosen.
    setTyped({
      place: String(form.get("place") ?? ""),
      equipment: form.getAll("equipment").map(String),
      target: String(form.get("targetMinutes")),
    });
    act(form);
  };
  return (
    <form key={state.version} action={submit} className="mt-6 flex flex-col gap-3">
      <input type="hidden" name="id" value={sessionId} />
      <fieldset className="flex flex-col gap-1">
        <legend className="font-semibold">{FIELD.place}</legend>
        {labelsIn("place").map((label) => (
          <label key={label.key} className="flex items-center gap-2">
            <input
              type="radio"
              name="place"
              value={label.key}
              defaultChecked={shown.place === label.key}
            />
            {label.name}
          </label>
        ))}
        <Refusal message={state.errors.place} />
      </fieldset>
      <fieldset className="flex flex-col gap-1">
        <legend className="font-semibold">{FIELD.equipment}</legend>
        {labelsIn("equipment").map((label) => (
          <label key={label.key} className="flex items-center gap-2">
            <input
              type="checkbox"
              name="equipment"
              value={label.key}
              defaultChecked={shown.equipment.includes(label.key)}
            />
            {label.name}
          </label>
        ))}
      </fieldset>
      <label htmlFor="session-target">{FIELD.target}</label>
      <input
        id="session-target"
        name="targetMinutes"
        inputMode="numeric"
        defaultValue={shown.target}
        className="self-start rounded border px-3 py-2"
      />
      <Refusal message={state.errors.target} />
      {state.message === null ? null : <output>{state.message}</output>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {SAVE}
      </button>
    </form>
  );
}

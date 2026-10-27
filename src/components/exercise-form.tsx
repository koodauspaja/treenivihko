"use client";

import { useActionState, useState } from "react";
import { type ExerciseFormState, saveExercise } from "@/app/trainer/exercises/actions";
import { Refusal } from "@/components/refusal";
import { type LabelGroup, labelsIn } from "@/lib/exercises/labels";
import { FIELD, GROUP_HEADING, LEVEL_NAMES, SAVE } from "@/lib/exercises/messages";
import type { AmountKind, ExerciseValues } from "@/lib/exercises/rules";

type Errors = ExerciseFormState["errors"];

const inputClass = "rounded border px-3 py-2";

function LabelChoices({
  group,
  values,
  errors,
}: Readonly<{ group: LabelGroup; values: ExerciseValues; errors: Errors }>) {
  const refusal = group === "equipment" ? undefined : errors[group];
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="font-semibold">{GROUP_HEADING[group]}</legend>
      {labelsIn(group).map((label) => (
        <label key={label.key} className="flex items-center gap-2">
          <input
            type="checkbox"
            name="label"
            value={label.key}
            defaultChecked={values.labels.includes(label.key)}
          />
          {label.name}
        </label>
      ))}
      <Refusal message={refusal} />
    </fieldset>
  );
}

/** The form's fields, started from `values`; only the chosen amount's field is sent. */
function Fields({ values, errors }: Readonly<{ values: ExerciseValues; errors: Errors }>) {
  // A kind that is neither is refused on the count's field, so the form shows that one.
  const [kind, setKind] = useState<AmountKind>(values.amountKind === "time" ? "time" : "count");
  return (
    <>
      <label htmlFor="exercise-name">{FIELD.name}</label>
      <input id="exercise-name" name="name" defaultValue={values.name} className={inputClass} />
      <Refusal message={errors.name} />

      <label htmlFor="exercise-instructions">{FIELD.instructions}</label>
      <textarea
        id="exercise-instructions"
        name="instructions"
        defaultValue={values.instructions}
        rows={5}
        className={inputClass}
      />
      <Refusal message={errors.instructions} />

      <label htmlFor="exercise-video">{FIELD.videoUrl}</label>
      <input
        id="exercise-video"
        name="videoUrl"
        // Not type="url": the browser would refuse first, in its own language.
        inputMode="url"
        defaultValue={values.videoUrl}
        className={inputClass}
      />
      <Refusal message={errors.videoUrl} />

      <fieldset className="flex flex-col gap-1">
        <legend className="font-semibold">{FIELD.amount}</legend>
        {(["count", "time"] as const).map((choice) => (
          <label key={choice} className="flex items-center gap-2">
            <input
              type="radio"
              name="amountKind"
              value={choice}
              checked={kind === choice}
              onChange={() => setKind(choice)}
            />
            {FIELD[choice]}
          </label>
        ))}
        {kind === "count" ? (
          <>
            <label htmlFor="exercise-count">{FIELD.times}</label>
            <input
              id="exercise-count"
              name="count"
              inputMode="numeric"
              defaultValue={values.count}
              className={inputClass}
            />
            <Refusal message={errors.count} />
          </>
        ) : (
          <>
            <label htmlFor="exercise-seconds">{FIELD.seconds}</label>
            <input
              id="exercise-seconds"
              name="seconds"
              inputMode="numeric"
              defaultValue={values.seconds}
              className={inputClass}
            />
            <Refusal message={errors.time} />
          </>
        )}
      </fieldset>

      <label htmlFor="exercise-duration">{FIELD.duration}</label>
      <input
        id="exercise-duration"
        name="durationMinutes"
        inputMode="numeric"
        defaultValue={values.durationMinutes}
        className={inputClass}
      />
      <Refusal message={errors.duration} />

      <fieldset className="flex flex-col gap-1">
        <legend className="font-semibold">{FIELD.level}</legend>
        {([1, 2, 3] as const).map((level) => (
          <label key={level} className="flex items-center gap-2">
            <input
              type="radio"
              name="level"
              value={level}
              defaultChecked={values.level === String(level)}
            />
            {LEVEL_NAMES[level]}
          </label>
        ))}
        <Refusal message={errors.level} />
      </fieldset>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="warmUp" defaultChecked={values.warmUp} />
        {FIELD.warmUp}
      </label>

      <LabelChoices group="skill" values={values} errors={errors} />
      <LabelChoices group="place" values={values} errors={errors} />
      <LabelChoices group="equipment" values={values} errors={errors} />
    </>
  );
}

/**
 * An exercise's form, new when there is no `exerciseId`. After each answer it
 * starts again from what the action sent back: what was typed after a
 * refusal, nothing after an add. decisions/f002-exercise-library.md
 */
export function ExerciseForm({
  exerciseId,
  initialValues,
}: Readonly<{ exerciseId?: string; initialValues: ExerciseValues }>) {
  const [state, action, pending] = useActionState(saveExercise, {
    version: 0,
    message: null,
    errors: {},
    values: initialValues,
  });
  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      {exerciseId === undefined ? null : <input type="hidden" name="id" value={exerciseId} />}
      <Fields key={state.version} values={state.values} errors={state.errors} />
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

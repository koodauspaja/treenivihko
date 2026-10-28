"use client";

import { useActionState, useState } from "react";
import { type MarkState, saveMarkFromForm } from "@/app/session/actions";
import { Refusal } from "@/components/refusal";
import { formText } from "@/lib/forms";
import { QUESTION, SKIP, STATUS_CHOICE } from "@/lib/marks/messages";
import { FEELINGS, type Mark, PICKS, type PickKey, STATUSES } from "@/lib/marks/rules";
import { SAVE } from "@/lib/periods/messages";

const START: MarkState = { version: 0, message: null, errors: {} };

/** The form's choices as text, each skipped one empty. */
type Values = {
  status: string;
  trainedOn: string;
  feeling: string;
  picks: Record<PickKey, string>;
};

type Exercise = { exerciseId: string; name: string };

const valuesOf = (mark: Mark | null, today: string): Values => ({
  status: mark?.status ?? "",
  trainedOn: mark?.trainedOn ?? today,
  feeling: mark?.feeling == null ? "" : String(mark.feeling),
  picks: {
    likedBest: mark?.picks.likedBest ?? "",
    likedLeast: mark?.picks.likedLeast ?? "",
    easiest: mark?.picks.easiest ?? "",
    hardest: mark?.picks.hardest ?? "",
  },
});

const valuesFrom = (form: FormData): Values => ({
  status: formText(form, "status"),
  trainedOn: formText(form, "trainedOn"),
  feeling: formText(form, "feeling"),
  picks: {
    likedBest: formText(form, "likedBest"),
    likedLeast: formText(form, "likedLeast"),
    easiest: formText(form, "easiest"),
    hardest: formText(form, "hardest"),
  },
});

const choice = "flex items-center gap-2";

function Fields({
  shown,
  exercises,
  errors,
}: Readonly<{ shown: Values; exercises: readonly Exercise[]; errors: MarkState["errors"] }>) {
  // Not done hides the rest: only a session done in full or in part has a day, a face and picks.
  const [status, setStatus] = useState(shown.status);
  return (
    <>
      <fieldset className="flex flex-col gap-1">
        <legend className="font-semibold">{QUESTION.status}</legend>
        {STATUSES.map((each) => (
          <label key={each} className={choice}>
            <input
              type="radio"
              name="status"
              value={each}
              defaultChecked={shown.status === each}
              onChange={() => setStatus(each)}
            />
            {STATUS_CHOICE[each]}
          </label>
        ))}
        <Refusal message={errors.status} />
      </fieldset>
      <div hidden={status === "not_done"} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <label htmlFor="mark-day" className="font-semibold">
            {QUESTION.trainedOn}
          </label>
          <input
            id="mark-day"
            type="date"
            name="trainedOn"
            defaultValue={shown.trainedOn}
            className="self-start rounded border px-3 py-2"
          />
          <Refusal message={errors.trainedOn} />
        </div>
        <fieldset className="flex flex-col gap-1">
          <legend className="font-semibold">{QUESTION.feeling}</legend>
          <div className="flex flex-wrap gap-3">
            {FEELINGS.map((each) => (
              <label key={each.value} className={`${choice} text-2xl`}>
                <input
                  type="radio"
                  name="feeling"
                  value={each.value}
                  aria-label={each.name}
                  defaultChecked={shown.feeling === String(each.value)}
                />
                <span aria-hidden="true">{each.emoji}</span>
              </label>
            ))}
            <label className={choice}>
              <input type="radio" name="feeling" value="" defaultChecked={shown.feeling === ""} />
              {SKIP}
            </label>
          </div>
        </fieldset>
        {exercises.length === 0
          ? null
          : PICKS.map((pick) => (
              <fieldset key={pick} className="flex flex-col gap-1">
                <legend className="font-semibold">{QUESTION[pick]}</legend>
                {exercises.map((each) => (
                  <label key={each.exerciseId} className={`${choice} break-words`}>
                    <input
                      type="radio"
                      name={pick}
                      value={each.exerciseId}
                      defaultChecked={shown.picks[pick] === each.exerciseId}
                    />
                    {each.name}
                  </label>
                ))}
                <label className={choice}>
                  <input
                    type="radio"
                    name={pick}
                    value=""
                    defaultChecked={
                      !exercises.some((each) => each.exerciseId === shown.picks[pick])
                    }
                  />
                  {SKIP}
                </label>
              </fieldset>
            ))}
        <Refusal message={errors.picks} />
      </div>
    </>
  );
}

/**
 * A session's mark: its status, day, face and four picks, with what was
 * chosen kept when refused, and the saved mark shown again whenever the page
 * brings a newer one. A pick whose exercise has left the session shows Ohita.
 * decisions/f004-periods-and-sessions.md
 * decisions/f006-session-marks.md
 */
export function MarkForm({
  sessionId,
  today,
  exercises,
  mark,
}: Readonly<{
  sessionId: string;
  today: string;
  exercises: readonly Exercise[];
  mark: Mark | null;
}>) {
  const [state, act, pending] = useActionState(saveMarkFromForm, START);
  const saved = valuesOf(mark, today);
  const savedKey = JSON.stringify(saved);
  // React empties a form after its action, so refused choices are put back from
  // here, while the page still has the mark they were refused against.
  const [typed, setTyped] = useState({ values: saved, against: savedKey });
  const errors = typed.against === savedKey ? state.errors : {};
  const shown = Object.keys(errors).length === 0 ? saved : typed.values;
  const submit = (form: FormData) => {
    setTyped({ values: valuesFrom(form), against: savedKey });
    act(form);
  };
  return (
    <form key={`${state.version}|${savedKey}`} action={submit} className="mt-6 flex flex-col gap-6">
      <input type="hidden" name="id" value={sessionId} />
      <Fields shown={shown} exercises={exercises} errors={errors} />
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

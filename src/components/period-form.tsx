"use client";

import { useActionState, useState } from "react";
import {
  createPeriodFromForm,
  type PeriodFormState,
  savePeriodDates,
} from "@/app/trainer/periods/actions";
import { Refusal } from "@/components/refusal";
import { CREATE_PERIOD, FIELD, SAVE, weeksLabel } from "@/lib/periods/messages";
import { WEEKS_MAX } from "@/lib/periods/rules";

/**
 * A period's start and length: a new period's when there is no `periodId`,
 * which the action creates as a copy of the latest. What was sent is kept when
 * refused, until the page brings newer dates; otherwise the page's dates are shown.
 * decisions/f004-periods-and-sessions.md
 */
export function PeriodForm({
  periodId,
  initial,
}: Readonly<{ periodId?: string; initial: { startsOn: string; weeks: string } }>) {
  const [state, action, pending] = useActionState(
    periodId === undefined ? createPeriodFromForm : savePeriodDates,
    { version: 0, message: null, errors: {}, values: initial } satisfies PeriodFormState
  );
  const savedKey = `${initial.startsOn}|${initial.weeks}`;
  // A refusal stands while the page still has the dates it was refused against.
  const [against, setAgainst] = useState(savedKey);
  const errors = against === savedKey ? state.errors : {};
  const shown = Object.keys(errors).length === 0 ? initial : state.values;
  const submit = (form: FormData) => {
    setAgainst(savedKey);
    action(form);
  };
  return (
    <form action={submit} className="mt-4 flex flex-col gap-3">
      {periodId === undefined ? null : <input type="hidden" name="id" value={periodId} />}
      <div key={`${state.version}|${savedKey}`} className="flex flex-col gap-3">
        <label htmlFor="period-start">{FIELD.startsOn}</label>
        <input
          id="period-start"
          name="startsOn"
          type="date"
          defaultValue={shown.startsOn}
          className="self-start rounded border px-3 py-2"
        />
        <Refusal message={errors.startsOn} />
        <label htmlFor="period-weeks">{FIELD.weeks}</label>
        <select
          id="period-weeks"
          name="weeks"
          defaultValue={shown.weeks}
          className="self-start rounded border px-3 py-2"
        >
          {Array.from({ length: WEEKS_MAX }, (_, index) => index + 1).map((weeks) => (
            <option key={weeks} value={weeks}>
              {weeksLabel(weeks)}
            </option>
          ))}
        </select>
        <Refusal message={errors.weeks} />
      </div>
      {state.message === null ? null : <output>{state.message}</output>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {periodId === undefined ? CREATE_PERIOD : SAVE}
      </button>
    </form>
  );
}

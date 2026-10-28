"use client";

import { useActionState } from "react";
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
 * refused; otherwise the page's dates are shown, newer ones included.
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
  const shown = Object.keys(state.errors).length === 0 ? initial : state.values;
  return (
    <form action={action} className="mt-4 flex flex-col gap-3">
      {periodId === undefined ? null : <input type="hidden" name="id" value={periodId} />}
      <div
        key={`${state.version}|${initial.startsOn}|${initial.weeks}`}
        className="flex flex-col gap-3"
      >
        <label htmlFor="period-start">{FIELD.startsOn}</label>
        <input
          id="period-start"
          name="startsOn"
          type="date"
          defaultValue={shown.startsOn}
          className="self-start rounded border px-3 py-2"
        />
        <Refusal message={state.errors.startsOn} />
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
        <Refusal message={state.errors.weeks} />
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

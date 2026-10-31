"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  createPeriodFromForm,
  type PeriodFormState,
  savePeriodDates,
} from "@/app/trainer/periods/actions";
import { Refusal } from "@/components/refusal";
import {
  ADAPT,
  ADAPT_HELP,
  CHANGES_HEADING,
  CREATE_PERIOD,
  createdHeading,
  FIELD,
  NO_CHANGES,
  OPEN_PERIOD,
  SAVE,
  weeksLabel,
} from "@/lib/periods/messages";
import { WEEKS_MAX } from "@/lib/periods/rules";
import { periodPath } from "@/lib/trainer/paths";

/**
 * A period's start and length: a new period's when there is no `periodId`,
 * which the action creates as a copy of the latest, adapted to its marks when
 * `adaptable` and checked, then shows what changed in place of the form. What
 * was sent is kept when refused, until the page brings newer dates; otherwise
 * the page's dates are shown.
 *
 * decisions/f004-periods-and-sessions.md
 * decisions/f009-adapted-period.md
 */
export function PeriodForm({
  periodId,
  initial,
  adaptable = false,
}: Readonly<{
  periodId?: string;
  initial: { startsOn: string; weeks: string };
  adaptable?: boolean;
}>) {
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
  if (state.created !== undefined) {
    return <Created {...state.created} />;
  }
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
      {adaptable ? (
        <>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="adapt" defaultChecked />
            {ADAPT}
          </label>
          <p className="text-sm">{ADAPT_HELP}</p>
        </>
      ) : null}
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

/** An adapted copy, once: its span, what the marks changed, and the way to it. */
function Created({
  id,
  span,
  changes,
}: Readonly<{ id: string; span: string; changes: { id: string; line: string }[] }>) {
  return (
    <section className="mt-4">
      <h2 className="text-2xl font-semibold">{createdHeading(span)}</h2>
      {changes.length === 0 ? (
        <p className="mt-2">{NO_CHANGES}</p>
      ) : (
        <>
          <p className="mt-2">{CHANGES_HEADING}</p>
          <ul className="mt-2 list-disc pl-6">
            {changes.map((change) => (
              <li key={change.id}>{change.line}</li>
            ))}
          </ul>
        </>
      )}
      <Link href={periodPath(id)} className="mt-4 inline-block underline">
        {OPEN_PERIOD}
      </Link>
    </section>
  );
}

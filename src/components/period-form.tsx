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
 * A period's start and length; with no `periodId`, a new period, copied from
 * the latest and adapted to its marks when `adaptable` and checked. A refusal
 * keeps what was sent until the page brings newer dates.
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
  // The choice as last sent: the fields are rebuilt after each answer, and React resets
  // the form to their defaults, so the default is what the parent chose.
  const [adapt, setAdapt] = useState(true);
  const submit = (form: FormData) => {
    setAgainst(savedKey);
    setAdapt(form.get("adapt") === "on");
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
        {adaptable ? (
          <>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="adapt" defaultChecked={adapt} />
              {ADAPT}
            </label>
            <p className="text-sm">{ADAPT_HELP}</p>
          </>
        ) : null}
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

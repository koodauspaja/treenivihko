import Link from "next/link";
import { notFound } from "next/navigation";
import { addSessionFromForm, removePeriod } from "@/app/trainer/periods/actions";
import { ActionButton } from "@/components/action-button";
import { ConfirmAction } from "@/components/confirm-action";
import { PeriodForm } from "@/components/period-form";
import { TrainerTimeout } from "@/components/trainer-timeout";
import { nameOf } from "@/lib/exercises/labels";
import { spanOf, today } from "@/lib/periods/dates";
import {
  ADD_SESSION,
  CURRENT,
  confirmDeletePeriod,
  copiedFrom,
  DELETE_PERIOD,
  NO_PERIODS,
  NO_SESSIONS,
  periodHeading,
  STARTS_EMPTY,
  sessionCount,
  sessionHeading,
  sessionLine,
} from "@/lib/periods/messages";
import { currentOf, latestOf, newPeriodDates } from "@/lib/periods/rules";
import { getPeriod, listPeriodDates, listPeriods } from "@/lib/periods/store";
import { requireTrainer } from "@/lib/trainer/access";
import { periodPath, sessionPath } from "@/lib/trainer/paths";

/**
 * The periods' pages' content, each behind the unlock.
 *
 * decisions/f001-trainer-side.md
 * decisions/f004-periods-and-sessions.md
 */

/** The parent's periods, newest first, the current one marked. */
export async function PeriodList() {
  const { user, expiresAt } = await requireTrainer();
  const periods = await listPeriods(user.id);
  const current = currentOf(periods, today());
  return (
    <>
      <TrainerTimeout expiresAt={expiresAt.toISOString()} />
      {periods.length === 0 ? (
        <p className="mt-6">{NO_PERIODS}</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {periods.map((each) => (
            <li key={each.id}>
              <Link href={periodPath(each.id)} className="underline">
                {spanOf(each)}
              </Link>
              {each.id === current?.id ? ` ${CURRENT}` : ""}
              <p className="text-sm">{sessionCount(each.sessionCount)}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** A new period's form, starting after the latest, which it copies. */
export async function NewPeriod() {
  const { user, expiresAt } = await requireTrainer();
  const latest = latestOf(await listPeriodDates(user.id));
  const dates = newPeriodDates(latest, today());
  return (
    <>
      <TrainerTimeout expiresAt={expiresAt.toISOString()} />
      <p className="mt-4">{latest === undefined ? STARTS_EMPTY : copiedFrom(spanOf(latest))}</p>
      <PeriodForm initial={{ startsOn: dates.startsOn, weeks: String(dates.weeks) }} />
    </>
  );
}

/** One of the parent's periods: its dates, its sessions, and its deletion; another's is not found. */
export async function PeriodView({ id }: Readonly<{ id: Promise<string> }>) {
  const { user, expiresAt } = await requireTrainer();
  const found = await getPeriod(user.id, await id);
  if (found === null) {
    notFound();
  }
  const span = spanOf(found);
  const isCurrent = currentOf([found], today()) !== undefined;
  return (
    <>
      <TrainerTimeout expiresAt={expiresAt.toISOString()} />
      <h1 className="text-3xl font-bold">{periodHeading(span)}</h1>
      {isCurrent ? <p className="mt-2">{CURRENT}</p> : null}
      <PeriodForm
        periodId={found.id}
        initial={{ startsOn: found.startsOn, weeks: String(found.weeks) }}
      />
      {found.sessions.length === 0 ? (
        <p className="mt-6">{NO_SESSIONS}</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {found.sessions.map((each) => (
            <li key={each.id}>
              <Link href={sessionPath(each.id)} className="underline">
                {sessionHeading(each.position)}
              </Link>
              <p className="text-sm">
                {sessionLine(nameOf(each.place), each.totalMinutes, each.targetMinutes)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <ActionButton
          action={addSessionFromForm}
          fields={{ periodId: found.id }}
          label={ADD_SESSION}
        />
      </div>
      <div className="mt-8">
        <ConfirmAction
          action={removePeriod}
          fields={{ id: found.id }}
          label={DELETE_PERIOD}
          question={confirmDeletePeriod(span)}
        />
      </div>
    </>
  );
}

import Link from "next/link";
import { MarkLine } from "@/components/mark-line";
import { AchievementSections } from "@/components/streak";
import { SIGNED_IN_PATH } from "@/lib/auth/paths";
import { requireUser } from "@/lib/auth/session";
import { BACK } from "@/lib/messages";
import { spanOf, today } from "@/lib/periods/dates";
import { NO_SESSIONS, periodHeading, sessionHeading } from "@/lib/periods/messages";
import {
  countsLine,
  doneLine,
  EXERCISES_HEADING,
  NO_PICKED_EXERCISES,
  NO_STARTED_PERIOD,
  NOT_MARKED,
  PROGRESS,
} from "@/lib/progress/messages";
import { doneCount } from "@/lib/progress/rules";
import { getProgress, type PeriodProgress } from "@/lib/progress/store";
import { getAchievements } from "@/lib/streaks/store";

/**
 * The child's progress: the streak, the accomplishments and the next goals;
 * every period that has started, with its sessions' marks; and every
 * exercise the marks pick, with its counts. For a signed-in browser; it has
 * no way to mark, and its one write is recording what has been earned.
 *
 * decisions/029-sign-in.md
 * decisions/f006-session-marks.md
 * decisions/f007-progress.md
 * decisions/f008-streaks-and-accomplishments.md
 */

function Period({ period }: Readonly<{ period: PeriodProgress }>) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold break-words">{periodHeading(spanOf(period))}</h2>
      {period.sessions.length === 0 ? (
        <p className="mt-2">{NO_SESSIONS}</p>
      ) : (
        <>
          <p className="mt-1">{doneLine(doneCount(period.sessions), period.sessions.length)}</p>
          {period.sessions.map((each) => (
            <div key={each.id} className="mt-3">
              <h3 className="text-lg font-semibold">{sessionHeading(each.position)}</h3>
              {each.mark === null ? <p>{NOT_MARKED}</p> : <MarkLine mark={each.mark} />}
            </div>
          ))}
        </>
      )}
    </section>
  );
}

/** The progress page's content, for today in Finland. */
export async function ProgressView() {
  const user = await requireUser();
  const day = today();
  const [{ periods, exercises }, achievements] = await Promise.all([
    getProgress(user.id, day),
    getAchievements(user.id, day),
  ]);
  return (
    <>
      <h1 className="text-3xl font-bold">{PROGRESS}</h1>
      <AchievementSections achievements={achievements} />
      {periods.length === 0 ? (
        <p className="mt-4">{NO_STARTED_PERIOD}</p>
      ) : (
        periods.map((each) => <Period key={each.id} period={each} />)
      )}
      <section className="mt-10">
        <h2 className="text-xl font-semibold">{EXERCISES_HEADING}</h2>
        {exercises.length === 0 ? (
          <p className="mt-2">{NO_PICKED_EXERCISES}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {exercises.map((each) => (
              <li key={each.exerciseId}>
                <p className="font-semibold break-words">{each.name}</p>
                <p className="text-sm">{countsLine(each.counts)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Link href={SIGNED_IN_PATH} className="mt-8 block underline">
        {BACK}
      </Link>
    </>
  );
}

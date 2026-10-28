import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkStatus, PreviousPeriod } from "@/components/marks";
import { VideoLink } from "@/components/video-link";
import { SIGNED_IN_PATH } from "@/lib/auth/paths";
import { requireUser } from "@/lib/auth/session";
import { nameOf } from "@/lib/exercises/labels";
import { formatAmount, formatDuration } from "@/lib/exercises/rules";
import { getChildMarks, type MarkSummary } from "@/lib/marks/store";
import { BACK } from "@/lib/messages";
import { EMPTY_SESSION, NO_PERIOD, sessionLine, startsOn } from "@/lib/notebook/messages";
import { notebookExercisePath } from "@/lib/notebook/paths";
import { formatDay, spanOf, today } from "@/lib/periods/dates";
import { NO_SESSIONS, periodHeading, sessionHeading } from "@/lib/periods/messages";
import { getNotebook, getNotebookExercise, type NotebookSession } from "@/lib/periods/store";

/**
 * The child's notebook view: the period to copy, each session's mark and the
 * way to mark it while its period may be marked, and one exercise's page. For
 * a signed-in browser; nothing here changes anything but a mark.
 *
 * decisions/029-sign-in.md
 * decisions/f004-periods-and-sessions.md
 * decisions/f005-notebook-view.md
 * decisions/f006-session-marks.md
 */

function Session({
  session,
  markable,
  mark,
}: Readonly<{ session: NotebookSession; markable: boolean; mark: MarkSummary | undefined }>) {
  return (
    <section className="mt-6">
      <h3 className="text-lg font-semibold">{sessionHeading(session.position)}</h3>
      <p>{sessionLine(nameOf(session.place), session.targetMinutes)}</p>
      {markable ? <MarkStatus sessionId={session.id} mark={mark} /> : null}
      {session.blocks.length === 0 ? (
        <p className="mt-2">{EMPTY_SESSION}</p>
      ) : (
        session.blocks.map((block) => (
          <div key={block.id} className="mt-3">
            <h4 className="font-semibold break-words">{block.theme}</h4>
            {block.exercises.length === 0 ? null : (
              <ul>
                {block.exercises.map((each) => (
                  <li key={each.id} className="break-words">
                    <Link href={notebookExercisePath(each.id)} className="underline">
                      {each.name}
                    </Link>
                    {` – ${formatAmount(each.amountKind, each.amount)}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))
      )}
    </section>
  );
}

/**
 * The period the child copies: the current one, or the next, or the message
 * that there is none; then the latest period that ended, to mark.
 */
export async function Notebook({ userId }: Readonly<{ userId: string }>) {
  const day = today();
  const [notebook, marks] = await Promise.all([
    getNotebook(userId, day),
    getChildMarks(userId, day),
  ]);
  if (notebook === null) {
    return (
      <>
        <p className="mt-4">{NO_PERIOD}</p>
        <PreviousPeriod marks={marks} />
      </>
    );
  }
  const { period, sessions } = notebook;
  // The next period, before it starts, is copied but not marked.
  const markable = period.startsOn <= day;
  return (
    <>
      <h2 className="mt-6 text-xl font-semibold break-words">{periodHeading(spanOf(period))}</h2>
      {markable ? null : <p className="mt-1">{startsOn(formatDay(period.startsOn))}</p>}
      {sessions.length === 0 ? (
        <p className="mt-4">{NO_SESSIONS}</p>
      ) : (
        sessions.map((each) => (
          <Session key={each.id} session={each} markable={markable} mark={marks.marks[each.id]} />
        ))
      )}
      <PreviousPeriod marks={marks} />
    </>
  );
}

/** One exercise of the period shown, with its amount in its block; any other is not found. */
export async function NotebookExerciseView({ id }: Readonly<{ id: Promise<string> }>) {
  const user = await requireUser();
  const found = await getNotebookExercise(user.id, await id, today());
  if (found === null) {
    notFound();
  }
  return (
    <>
      <h1 className="text-3xl font-bold break-words">{found.name}</h1>
      <p className="mt-4">{formatAmount(found.amountKind, found.amount)}</p>
      <p>{formatDuration(found.durationMinutes)}</p>
      <p className="mt-4 whitespace-pre-line break-words">{found.instructions}</p>
      <VideoLink url={found.videoUrl} />
      <Link href={SIGNED_IN_PATH} className="mt-8 block underline">
        {BACK}
      </Link>
    </>
  );
}

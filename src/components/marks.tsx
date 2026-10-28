import Link from "next/link";
import { notFound } from "next/navigation";
import { removeMark } from "@/app/session/actions";
import { ConfirmAction } from "@/components/confirm-action";
import { MarkForm } from "@/components/mark-form";
import { SIGNED_IN_PATH } from "@/lib/auth/paths";
import { requireUser } from "@/lib/auth/session";
import {
  CHANGE,
  CONFIRM_DELETE_MARK,
  DELETE_MARK,
  MARK,
  markLine,
  previousHeading,
} from "@/lib/marks/messages";
import { emojiOf } from "@/lib/marks/rules";
import { type ChildMarks, getMarkPage, type MarkSummary } from "@/lib/marks/store";
import { BACK } from "@/lib/messages";
import { markPath } from "@/lib/notebook/paths";
import { formatDay, spanOf, today } from "@/lib/periods/dates";
import { NO_SESSIONS, periodHeading, sessionHeading } from "@/lib/periods/messages";

/**
 * The child's marks: a session's mark and the link to change it, the
 * previous period's sessions to mark, and a session's marking page.
 *
 * decisions/029-sign-in.md
 * decisions/f005-notebook-view.md
 * decisions/f006-session-marks.md
 */

/** A session's mark, when it has one, and the link to its marking page. */
export function MarkStatus({
  sessionId,
  mark,
}: Readonly<{ sessionId: string; mark: MarkSummary | undefined }>) {
  return (
    <>
      {mark === undefined ? null : (
        <p>
          {markLine(
            mark.status,
            mark.trainedOn === null ? "" : formatDay(mark.trainedOn),
            emojiOf(mark.feeling)
          )}
        </p>
      )}
      <Link href={markPath(sessionId)} className="underline">
        {mark === undefined ? MARK : CHANGE}
      </Link>
    </>
  );
}

/** The latest period that ended, its sessions to mark, when there is one. */
export function PreviousPeriod({ marks }: Readonly<{ marks: ChildMarks }>) {
  const { previous } = marks;
  if (previous === null) {
    return null;
  }
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold break-words">
        {previousHeading(spanOf(previous.period))}
      </h2>
      {previous.sessions.length === 0 ? (
        <p className="mt-4">{NO_SESSIONS}</p>
      ) : (
        previous.sessions.map((each) => (
          <div key={each.id} className="mt-4">
            <h3 className="text-lg font-semibold">{sessionHeading(each.position)}</h3>
            <MarkStatus sessionId={each.id} mark={marks.marks[each.id]} />
          </div>
        ))
      )}
    </section>
  );
}

/** A session's marking page, for a session the child may mark today; any other is not found. */
export async function MarkView({ id }: Readonly<{ id: Promise<string> }>) {
  const user = await requireUser();
  const day = today();
  const found = await getMarkPage(user.id, await id, day);
  if (found === null) {
    notFound();
  }
  return (
    <>
      <h1 className="text-3xl font-bold">{sessionHeading(found.position)}</h1>
      <p className="mt-1 break-words">{periodHeading(spanOf(found.period))}</p>
      <MarkForm sessionId={found.id} today={day} exercises={found.exercises} mark={found.mark} />
      {found.mark === null ? null : (
        <div className="mt-8">
          <ConfirmAction
            action={removeMark}
            fields={{ id: found.id }}
            label={DELETE_MARK}
            question={CONFIRM_DELETE_MARK}
          />
        </div>
      )}
      <Link href={SIGNED_IN_PATH} className="mt-8 block underline">
        {BACK}
      </Link>
    </>
  );
}

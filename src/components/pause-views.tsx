import { removePause } from "@/app/trainer/pauses/actions";
import { ConfirmAction } from "@/components/confirm-action";
import { PauseForm } from "@/components/pause-form";
import { TrainerTimeout } from "@/components/trainer-timeout";
import { DELETE } from "@/lib/messages";
import { addDays, today } from "@/lib/periods/dates";
import { confirmDeletePause, NO_PAUSES, pauseSpan } from "@/lib/streaks/messages";
import { listPauses } from "@/lib/streaks/store";
import { requireTrainer } from "@/lib/trainer/access";

/**
 * The pauses' page's content, behind the unlock: each pause with its
 * deletion, then the form for a new one, a week from today.
 *
 * decisions/f001-trainer-side.md
 * decisions/f004-periods-and-sessions.md
 * decisions/f008-streaks-and-accomplishments.md
 */
export async function PauseList() {
  const { user, expiresAt } = await requireTrainer();
  const pauses = await listPauses(user.id);
  const day = today();
  return (
    <>
      <TrainerTimeout expiresAt={expiresAt.toISOString()} />
      {pauses.length === 0 ? (
        <p className="mt-6">{NO_PAUSES}</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {pauses.map((each) => {
            const span = pauseSpan(each);
            return (
              <li key={each.id} className="flex flex-col gap-2">
                <p>{span}</p>
                <ConfirmAction
                  action={removePause}
                  fields={{ id: each.id }}
                  label={DELETE}
                  question={confirmDeletePause(span)}
                />
              </li>
            );
          })}
        </ul>
      )}
      <PauseForm initial={{ startsOn: day, endsOn: addDays(day, 6) }} />
    </>
  );
}

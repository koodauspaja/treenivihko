import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addBlockExerciseFromForm,
  addBlockFromForm,
  moveBlockExerciseFromForm,
  moveBlockFromForm,
  removeBlock,
  removeBlockExercise,
  removeSession,
  saveBlockAmount,
  saveBlockTheme,
} from "@/app/trainer/sessions/actions";
import { ActionButton } from "@/components/action-button";
import { ConfirmAction } from "@/components/confirm-action";
import { FieldForm } from "@/components/field-form";
import { SessionSettingsForm } from "@/components/session-settings-form";
import { TrainerTimeout } from "@/components/trainer-timeout";
import { nameOf } from "@/lib/exercises/labels";
import { FIELD as EXERCISE_FIELD } from "@/lib/exercises/messages";
import { byFinnishName, summaryOf } from "@/lib/exercises/rules";
import { listExercises } from "@/lib/exercises/store";
import { DELETE } from "@/lib/messages";
import { spanOf } from "@/lib/periods/dates";
import {
  ADD,
  ADD_BLOCK,
  ADD_EXERCISE,
  confirmDeleteBlock,
  confirmDeleteSession,
  DELETE_BLOCK,
  DELETE_SESSION,
  DOES_NOT_FIT,
  DOWN,
  FIELD,
  lengthLine,
  NO_BLOCK_EXERCISES,
  NO_BLOCKS,
  NOTHING_FITS,
  overTarget,
  pickerFilters,
  pickerHeading,
  sessionHeading,
  UP,
} from "@/lib/periods/messages";
import { fits, overBy, totalMinutes } from "@/lib/periods/rules";
import { type BlockView, getSession, type SessionDetail } from "@/lib/periods/store";
import { requireTrainer } from "@/lib/trainer/access";
import { BACK_LINK } from "@/lib/trainer/messages";
import { periodPath, pickerPath, sessionPath } from "@/lib/trainer/paths";

/**
 * A session's page and its exercise picker, each behind the unlock; a
 * session of another parent's is not found.
 *
 * decisions/f001-trainer-side.md
 * decisions/f002-exercise-library.md
 * decisions/f004-periods-and-sessions.md
 */

/** One small form that sends `fields` to `action`, for a move or a removal. */
function SmallButton({
  action,
  fields,
  label,
}: Readonly<{
  action: (form: FormData) => Promise<void>;
  fields: Readonly<Record<string, string>>;
  label: string;
}>) {
  return (
    <form action={action}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" className="rounded border px-3 py-1 text-sm">
        {label}
      </button>
    </form>
  );
}

/** The up and down buttons a row shows: none past either end. */
function Moves({
  action,
  id,
  index,
  count,
}: Readonly<{
  action: (form: FormData) => Promise<void>;
  id: string;
  index: number;
  count: number;
}>) {
  return (
    <>
      {index > 0 ? (
        <SmallButton action={action} fields={{ id, direction: "up" }} label={UP} />
      ) : null}
      {index < count - 1 ? (
        <SmallButton action={action} fields={{ id, direction: "down" }} label={DOWN} />
      ) : null}
    </>
  );
}

function Block({
  session,
  block,
  index,
}: Readonly<{ session: SessionDetail; block: BlockView; index: number }>) {
  return (
    <section aria-label={block.theme} className="mt-6 flex flex-col gap-3 rounded border p-3">
      <FieldForm
        action={saveBlockTheme}
        fields={{ id: block.id }}
        name="theme"
        label={FIELD.theme}
        initial={block.theme}
      />
      {block.exercises.length === 0 ? (
        <p>{NO_BLOCK_EXERCISES}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {block.exercises.map((each, position) => (
            <li key={each.id} className="flex flex-col gap-2">
              <p className="font-semibold">{each.name}</p>
              {fits(each.labels, session.place, session.equipment) ? null : (
                <p className="text-red-700">{DOES_NOT_FIT}</p>
              )}
              <FieldForm
                action={saveBlockAmount}
                fields={{ id: each.id }}
                name="amount"
                label={each.amountKind === "count" ? EXERCISE_FIELD.times : EXERCISE_FIELD.seconds}
                initial={String(each.amount)}
                inputMode="numeric"
              />
              <div className="flex gap-2">
                <Moves
                  action={moveBlockExerciseFromForm}
                  id={each.id}
                  index={position}
                  count={block.exercises.length}
                />
                <SmallButton action={removeBlockExercise} fields={{ id: each.id }} label={DELETE} />
              </div>
            </li>
          ))}
        </ol>
      )}
      <Link href={pickerPath(session.id, block.id)} className="self-start underline">
        {ADD_EXERCISE}
      </Link>
      <div className="flex flex-wrap gap-2">
        <Moves
          action={moveBlockFromForm}
          id={block.id}
          index={index}
          count={session.blocks.length}
        />
        <ConfirmAction
          action={removeBlock}
          fields={{ id: block.id }}
          label={DELETE_BLOCK}
          question={confirmDeleteBlock(block.theme)}
        />
      </div>
    </section>
  );
}

/** One of the parent's sessions: its settings, its length, its blocks, and its deletion. */
export async function SessionView({ id }: Readonly<{ id: Promise<string> }>) {
  const { user, expiresAt } = await requireTrainer();
  const session = await getSession(user.id, await id);
  if (session === null) {
    notFound();
  }
  const total = totalMinutes(session.blocks.flatMap((each) => each.exercises));
  const over = overBy(total, session.targetMinutes);
  const span = spanOf(session.period);
  return (
    <>
      <TrainerTimeout expiresAt={expiresAt.toISOString()} />
      <h1 className="text-3xl font-bold">{sessionHeading(session.position)}</h1>
      <Link href={periodPath(session.period.id)} className="mt-2 inline-block underline">
        {span}
      </Link>
      <SessionSettingsForm
        sessionId={session.id}
        place={session.place}
        equipment={session.equipment}
        targetMinutes={session.targetMinutes}
      />
      <p className="mt-6">{lengthLine(total, session.targetMinutes)}</p>
      {over === null ? null : <p className="text-red-700">{overTarget(over)}</p>}
      {session.blocks.length === 0 ? (
        <p className="mt-6">{NO_BLOCKS}</p>
      ) : (
        session.blocks.map((each, index) => (
          <Block key={each.id} session={session} block={each} index={index} />
        ))
      )}
      <div className="mt-6">
        <FieldForm
          action={addBlockFromForm}
          fields={{ sessionId: session.id }}
          name="theme"
          label={FIELD.theme}
          initial=""
          button={ADD_BLOCK}
        />
      </div>
      <div className="mt-8">
        <ConfirmAction
          action={removeSession}
          fields={{ id: session.id }}
          label={DELETE_SESSION}
          question={confirmDeleteSession(session.position)}
        />
      </div>
      <Link href={periodPath(session.period.id)} className="mt-8 inline-block underline">
        {BACK_LINK}
      </Link>
    </>
  );
}

/** The library exercises that fit a session's place and equipment, each to add to one of its blocks. */
export async function ExercisePicker({
  sessionId,
  blockId,
}: Readonly<{ sessionId: Promise<string>; blockId: Promise<string> }>) {
  const { user, expiresAt } = await requireTrainer();
  const session = await getSession(user.id, await sessionId);
  const wanted = await blockId;
  const target = session?.blocks.find((each) => each.id === wanted);
  if (session === null || target === undefined) {
    notFound();
  }
  const library = await listExercises(user.id);
  const fitting = library
    .filter((each) => fits(each.labels, session.place, session.equipment))
    .sort(byFinnishName);
  return (
    <>
      <TrainerTimeout expiresAt={expiresAt.toISOString()} />
      <h1 className="text-3xl font-bold">{pickerHeading(target.theme)}</h1>
      <p className="mt-4">{pickerFilters(nameOf(session.place), session.equipment.map(nameOf))}</p>
      {fitting.length === 0 ? (
        <p className="mt-6">{NOTHING_FITS}</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {fitting.map((each) => (
            <li key={each.id} className="flex flex-col gap-1">
              <p className="font-semibold">{each.name}</p>
              <p className="text-sm">{summaryOf(each)}</p>
              <ActionButton
                action={addBlockExerciseFromForm}
                fields={{ blockId: target.id, exerciseId: each.id }}
                label={ADD}
              />
            </li>
          ))}
        </ul>
      )}
      <Link href={sessionPath(session.id)} className="mt-8 inline-block underline">
        {BACK_LINK}
      </Link>
    </>
  );
}

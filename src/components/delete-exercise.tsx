import { removeExercise } from "@/app/trainer/exercises/actions";
import { ConfirmAction } from "@/components/confirm-action";
import { confirmDelete, DELETE_EXERCISE } from "@/lib/exercises/messages";

/**
 * Deletes an exercise, only after asking, or says which periods use it.
 * decisions/f002-exercise-library.md, decisions/f004-periods-and-sessions.md
 */
export function DeleteExercise({ id, name }: Readonly<{ id: string; name: string }>) {
  return (
    <ConfirmAction
      action={removeExercise}
      fields={{ id }}
      label={DELETE_EXERCISE}
      question={confirmDelete(name)}
    />
  );
}

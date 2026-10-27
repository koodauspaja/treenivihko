import { ImportForm, ImportPrompt } from "@/components/import-form";
import { TrainerTimeout } from "@/components/trainer-timeout";
import {
  FORM_HEADING,
  IMPORT_INTRODUCTION,
  PROMPT_HEADING,
  PROMPT_INTRODUCTION,
} from "@/lib/exercises/import-messages";
import { requireTrainer } from "@/lib/trainer/access";

/**
 * The import page's content, behind the unlock.
 * decisions/f001-trainer-side.md
 * decisions/f003-exercise-import.md
 */
export async function ExerciseImport() {
  const { expiresAt } = await requireTrainer();
  return (
    <>
      <TrainerTimeout expiresAt={expiresAt.toISOString()} />
      <p className="mt-4">{IMPORT_INTRODUCTION}</p>
      <h2 className="mt-8 text-xl font-semibold">{PROMPT_HEADING}</h2>
      <p className="mt-2 mb-3">{PROMPT_INTRODUCTION}</p>
      <ImportPrompt />
      <h2 className="mt-8 text-xl font-semibold">{FORM_HEADING}</h2>
      <ImportForm />
    </>
  );
}

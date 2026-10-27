"use server";

/**
 * The import's action. It is reachable by a direct POST, so it checks the
 * unlock itself; it logs every refusal with ids and counts, never the text.
 *
 * decisions/f003-exercise-import.md
 */

import { toStderr } from "@/lib/auth/allowlist";
import { importText, readImport } from "@/lib/exercises/import";
import {
  failingCount,
  failingHeading,
  IMPORT_REFUSAL,
  type ImportRefusal,
  imported,
  NAME_SAVED_MEANWHILE,
} from "@/lib/exercises/import-messages";
import { importExercises, listExercises } from "@/lib/exercises/store";
import { requireTrainer } from "@/lib/trainer/access";

export type ImportFormState = {
  // Changes on every answer, so the form starts again from `text`.
  version: number;
  // An import saved, or how many exercises fail.
  message: string | null;
  // Why the whole import was refused.
  refusal: string | null;
  failing: { heading: string; reasons: string[] }[];
  text: string;
};

const chosenFile = (value: FormDataEntryValue | null) =>
  // A file field with nothing chosen still sends an empty file, so an empty
  // one counts as none chosen.
  value instanceof File && value.size > 0 ? value : null;

/** Imports the chosen file or the pasted text, all or nothing, or says why not. */
export async function importFromForm(
  previous: ImportFormState,
  form: FormData
): Promise<ImportFormState> {
  const { user } = await requireTrainer();
  const version = previous.version + 1;
  const pasted = form.get("text");
  const text = typeof pasted === "string" ? pasted : "";
  const answer = { version, message: null, refusal: null, failing: [], text };
  const refuse = (reason: ImportRefusal) => {
    toStderr(`exercise import refused: user ${user.id}, ${reason}`);
    return { ...answer, refusal: IMPORT_REFUSAL[reason] };
  };

  const file = chosenFile(form.get("file"));
  const source = importText(file === null ? null : new Uint8Array(await file.arrayBuffer()), text);
  if (!source.ok) {
    return refuse(source.refusal);
  }
  const library = await listExercises(user.id);
  const reading = readImport(
    source.text,
    library.map((exercise) => exercise.name)
  );
  if (!reading.ok && "refusal" in reading) {
    return refuse(reading.refusal);
  }
  if (!reading.ok) {
    toStderr(
      `exercise import refused: user ${user.id}, ${reading.failing.length} of ${reading.total} exercises failing`
    );
    return {
      ...answer,
      message: failingCount(reading.failing.length),
      failing: reading.failing.map((each) => ({
        heading: failingHeading(each.position, each.name),
        reasons: each.reasons,
      })),
    };
  }
  const result = await importExercises(user.id, reading.exercises);
  if (result.kind === "nameInUse") {
    return { ...answer, refusal: NAME_SAVED_MEANWHILE };
  }
  return { ...answer, message: imported(result.count), text: "" };
}

"use client";

import { type FormEvent, useActionState, useState } from "react";
import { type ImportFormState, importFromForm } from "@/app/trainer/exercises/import/actions";
import { IMPORT_MAX_BYTES } from "@/lib/exercises/import";
import {
  COPIED,
  COPY_FAILED,
  COPY_PROMPT,
  FILE_FIELD,
  IMPORT_BUTTON,
  IMPORT_PROMPT,
  IMPORT_REFUSAL,
  NO_FILE,
  PROMPT_HEADING,
  TEXT_FIELD,
} from "@/lib/exercises/import-messages";

const inputClass = "rounded border px-3 py-2";

/** The prompt for an AI tool, and a button that copies it. decisions/f003-exercise-import.md */
export function ImportPrompt() {
  const [status, setStatus] = useState<string | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(IMPORT_PROMPT);
      setStatus(COPIED);
    } catch {
      setStatus(COPY_FAILED);
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <textarea
        readOnly
        value={IMPORT_PROMPT}
        rows={12}
        aria-label={PROMPT_HEADING}
        className={inputClass}
      />
      <button type="button" onClick={copy} className="self-start rounded border px-4 py-2">
        {COPY_PROMPT}
      </button>
      {status === null ? null : <output>{status}</output>}
    </div>
  );
}

/**
 * The file field, its button in Finnish: a plain file input shows the
 * browser's own words, in the browser's language. decisions/f003-exercise-import.md
 */
function FileChoice() {
  const [name, setName] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        id="import-file"
        name="file"
        type="file"
        accept=".json,application/json"
        className="peer sr-only"
        onChange={(event) => setName((event.currentTarget.files as FileList)[0]?.name ?? null)}
      />
      <label
        htmlFor="import-file"
        className="cursor-pointer rounded border px-4 py-2 peer-focus-visible:outline-2"
      >
        {FILE_FIELD}
      </label>
      <span>{name ?? NO_FILE}</span>
    </div>
  );
}

const START: ImportFormState = { version: 0, message: null, refusal: null, failing: [], text: "" };

/**
 * The import's form. A file or text over the limit is refused here before it
 * is sent, as a body over Next's 1 MB never reaches the action's own check.
 * decisions/f003-exercise-import.md
 */
export function ImportForm() {
  const [state, action, pending] = useActionState(importFromForm, START);
  const [tooLarge, setTooLarge] = useState(false);
  const checkSize = (event: FormEvent<HTMLFormElement>) => {
    const field = event.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const pasted = event.currentTarget.elements.namedItem("text") as HTMLTextAreaElement;
    // A file field always has its list, empty when nothing is chosen.
    const oversized =
      [...(field.files as FileList)].some((file) => file.size > IMPORT_MAX_BYTES) ||
      new TextEncoder().encode(pasted.value).length > IMPORT_MAX_BYTES;
    setTooLarge(oversized);
    if (oversized) {
      event.preventDefault();
    }
  };
  const refusal = tooLarge ? IMPORT_REFUSAL.size : state.refusal;
  return (
    <form action={action} onSubmit={checkSize} className="mt-4 flex flex-col gap-3">
      {refusal === null ? null : (
        <p role="alert" className="text-red-700">
          {refusal}
        </p>
      )}
      {!tooLarge && state.message !== null && state.failing.length === 0 ? (
        <output>{state.message}</output>
      ) : null}
      {!tooLarge && state.failing.length > 0 ? (
        <div role="alert" className="flex flex-col gap-2 text-red-700">
          <p>{state.message}</p>
          <ul className="flex flex-col gap-2">
            {state.failing.map((exercise) => (
              <li key={exercise.heading}>
                <p className="font-semibold">{exercise.heading}</p>
                <ul className="list-disc pl-6">
                  {exercise.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div key={state.version} className="flex flex-col gap-3">
        <FileChoice />
        <label htmlFor="import-text">{TEXT_FIELD}</label>
        <textarea
          id="import-text"
          name="text"
          defaultValue={state.text}
          rows={8}
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {IMPORT_BUTTON}
      </button>
    </form>
  );
}

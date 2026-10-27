"use client";

import { useState } from "react";
import { removeExercise } from "@/app/trainer/exercises/actions";
import { CANCEL, confirmDelete, DELETE, DELETE_EXERCISE } from "@/lib/exercises/messages";

/** Deletes an exercise, only after asking. decisions/f002-exercise-library.md */
export function DeleteExercise({ id, name }: Readonly<{ id: string; name: string }>) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="rounded border px-4 py-2">
        {DELETE_EXERCISE}
      </button>
    );
  }
  return (
    <form action={removeExercise} className="flex flex-col gap-3">
      <p>{confirmDelete(name)}</p>
      <input type="hidden" name="id" value={id} />
      <div className="flex gap-3">
        <button type="submit" className="rounded bg-red-700 px-4 py-2 text-white">
          {DELETE}
        </button>
        <button type="button" onClick={() => setAsking(false)} className="rounded border px-4 py-2">
          {CANCEL}
        </button>
      </div>
    </form>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { ExerciseLibrary } from "@/components/exercise-library";
import { LIBRARY_HEADING, NEW_EXERCISE } from "@/lib/exercises/messages";
import { BACK_LINK } from "@/lib/trainer/messages";
import { NEW_EXERCISE_PATH, TRAINER_PATH } from "@/lib/trainer/paths";

export default function ExercisesPage({ searchParams }: PageProps<"/trainer/exercises">) {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold">{LIBRARY_HEADING}</h1>
      <Link href={NEW_EXERCISE_PATH} className="mt-4 inline-block underline">
        {NEW_EXERCISE}
      </Link>
      <Suspense fallback={<p className="mt-4">Ladataan…</p>}>
        <ExerciseLibrary query={searchParams} />
      </Suspense>
      <Link href={TRAINER_PATH} className="mt-8 inline-block underline">
        {BACK_LINK}
      </Link>
    </main>
  );
}

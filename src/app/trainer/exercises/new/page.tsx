import Link from "next/link";
import { Suspense } from "react";
import { NewExercise } from "@/components/exercise-editor";
import { NEW_EXERCISE } from "@/lib/exercises/messages";
import { BACK_LINK } from "@/lib/trainer/messages";
import { EXERCISES_PATH } from "@/lib/trainer/paths";

export default function NewExercisePage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold">{NEW_EXERCISE}</h1>
      <Suspense fallback={<p className="mt-4">Ladataan…</p>}>
        <NewExercise />
      </Suspense>
      <Link href={EXERCISES_PATH} className="mt-8 inline-block underline">
        {BACK_LINK}
      </Link>
    </main>
  );
}

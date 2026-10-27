import Link from "next/link";
import { Suspense } from "react";
import { ExistingExercise } from "@/components/exercise-editor";
import { BACK_LINK } from "@/lib/trainer/messages";
import { EXERCISES_PATH } from "@/lib/trainer/paths";

export default function ExercisePage({ params }: PageProps<"/trainer/exercises/[id]">) {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <Suspense fallback={<p className="mt-4">Ladataan…</p>}>
        <ExistingExercise id={params.then((p) => p.id)} />
      </Suspense>
      <Link href={EXERCISES_PATH} className="mt-8 inline-block underline">
        {BACK_LINK}
      </Link>
    </main>
  );
}

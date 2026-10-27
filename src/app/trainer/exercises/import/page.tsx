import Link from "next/link";
import { Suspense } from "react";
import { ExerciseImport } from "@/components/exercise-import";
import { IMPORT_HEADING } from "@/lib/exercises/import-messages";
import { BACK_LINK } from "@/lib/trainer/messages";
import { EXERCISES_PATH } from "@/lib/trainer/paths";

export default function ImportPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold">{IMPORT_HEADING}</h1>
      <Suspense fallback={<p className="mt-4">Ladataan…</p>}>
        <ExerciseImport />
      </Suspense>
      <Link href={EXERCISES_PATH} className="mt-8 inline-block underline">
        {BACK_LINK}
      </Link>
    </main>
  );
}

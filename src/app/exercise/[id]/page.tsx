import { Suspense } from "react";
import { NotebookExerciseView } from "@/components/notebook";

export default function NotebookExercisePage({ params }: PageProps<"/exercise/[id]">) {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <Suspense fallback={<p className="mt-4">Ladataan…</p>}>
        <NotebookExerciseView id={params.then((p) => p.id)} />
      </Suspense>
    </main>
  );
}

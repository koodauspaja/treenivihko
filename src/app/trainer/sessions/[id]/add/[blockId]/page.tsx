import { Suspense } from "react";
import { ExercisePicker } from "@/components/session-views";

export default function PickerPage({ params }: PageProps<"/trainer/sessions/[id]/add/[blockId]">) {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <Suspense fallback={<p className="mt-4">Ladataan…</p>}>
        <ExercisePicker
          sessionId={params.then((p) => p.id)}
          blockId={params.then((p) => p.blockId)}
        />
      </Suspense>
    </main>
  );
}

import { Suspense } from "react";
import { TrainerPanel } from "@/components/trainer-panel";
import { TRAINER_HEADING } from "@/lib/trainer/messages";

export default function TrainerPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold">{TRAINER_HEADING}</h1>
      <Suspense fallback={<p className="mt-4">Ladataan…</p>}>
        <TrainerPanel />
      </Suspense>
    </main>
  );
}

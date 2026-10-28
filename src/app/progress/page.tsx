import { Suspense } from "react";
import { ProgressView } from "@/components/progress";

export default function ProgressPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <Suspense fallback={<p className="mt-4">Ladataan…</p>}>
        <ProgressView />
      </Suspense>
    </main>
  );
}

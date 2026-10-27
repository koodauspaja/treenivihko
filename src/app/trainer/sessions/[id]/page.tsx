import { Suspense } from "react";
import { SessionView } from "@/components/session-views";

export default function SessionPage({ params }: PageProps<"/trainer/sessions/[id]">) {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <Suspense fallback={<p className="mt-4">Ladataan…</p>}>
        <SessionView id={params.then((p) => p.id)} />
      </Suspense>
    </main>
  );
}

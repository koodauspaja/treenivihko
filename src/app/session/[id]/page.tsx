import { Suspense } from "react";
import { MarkView } from "@/components/marks";

export default function MarkPage({ params }: PageProps<"/session/[id]">) {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <Suspense fallback={<p className="mt-4">Ladataan…</p>}>
        <MarkView id={params.then((p) => p.id)} />
      </Suspense>
    </main>
  );
}

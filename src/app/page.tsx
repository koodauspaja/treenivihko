import { Suspense } from "react";
import { SignedInPanel } from "@/components/signed-in-panel";

export default function Home() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold">Treenivihko</h1>
      <Suspense fallback={<p className="mt-4">Ladataan…</p>}>
        <SignedInPanel />
      </Suspense>
    </main>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { PeriodView } from "@/components/period-views";
import { BACK_LINK } from "@/lib/trainer/messages";
import { PERIODS_PATH } from "@/lib/trainer/paths";

export default function PeriodPage({ params }: PageProps<"/trainer/periods/[id]">) {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <Suspense fallback={<p className="mt-4">Ladataan…</p>}>
        <PeriodView id={params.then((p) => p.id)} />
      </Suspense>
      <Link href={PERIODS_PATH} className="mt-8 inline-block underline">
        {BACK_LINK}
      </Link>
    </main>
  );
}

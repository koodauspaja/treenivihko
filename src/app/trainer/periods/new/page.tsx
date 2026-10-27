import Link from "next/link";
import { Suspense } from "react";
import { NewPeriod } from "@/components/period-views";
import { NEW_PERIOD } from "@/lib/periods/messages";
import { BACK_LINK } from "@/lib/trainer/messages";
import { PERIODS_PATH } from "@/lib/trainer/paths";

export default function NewPeriodPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold">{NEW_PERIOD}</h1>
      <Suspense fallback={<p className="mt-4">Ladataan…</p>}>
        <NewPeriod />
      </Suspense>
      <Link href={PERIODS_PATH} className="mt-8 inline-block underline">
        {BACK_LINK}
      </Link>
    </main>
  );
}

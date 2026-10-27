import Link from "next/link";
import { Suspense } from "react";
import { PeriodList } from "@/components/period-views";
import { NEW_PERIOD, PERIODS_HEADING } from "@/lib/periods/messages";
import { BACK_LINK } from "@/lib/trainer/messages";
import { NEW_PERIOD_PATH, TRAINER_PATH } from "@/lib/trainer/paths";

export default function PeriodsPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold">{PERIODS_HEADING}</h1>
      <Link href={NEW_PERIOD_PATH} className="mt-4 inline-block underline">
        {NEW_PERIOD}
      </Link>
      <Suspense fallback={<p className="mt-4">Ladataan…</p>}>
        <PeriodList />
      </Suspense>
      <Link href={TRAINER_PATH} className="mt-8 inline-block underline">
        {BACK_LINK}
      </Link>
    </main>
  );
}

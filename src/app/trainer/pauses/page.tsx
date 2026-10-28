import Link from "next/link";
import { Suspense } from "react";
import { PauseList } from "@/components/pause-views";
import { PAUSES_HEADING, PAUSES_INTRO } from "@/lib/streaks/messages";
import { BACK_LINK } from "@/lib/trainer/messages";
import { TRAINER_PATH } from "@/lib/trainer/paths";

export default function PausesPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold">{PAUSES_HEADING}</h1>
      <p className="mt-2">{PAUSES_INTRO}</p>
      <Suspense fallback={<p className="mt-4">Ladataan…</p>}>
        <PauseList />
      </Suspense>
      <Link href={TRAINER_PATH} className="mt-8 inline-block underline">
        {BACK_LINK}
      </Link>
    </main>
  );
}

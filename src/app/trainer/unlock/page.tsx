import Link from "next/link";
import { Suspense } from "react";
import { LockPanel } from "@/components/lock-panel";
import { SIGNED_IN_PATH } from "@/lib/auth/paths";
import { BACK_LINK, TRAINER_HEADING } from "@/lib/trainer/messages";

export default function UnlockPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold">{TRAINER_HEADING}</h1>
      <Suspense fallback={<p className="mt-4">Ladataan…</p>}>
        <LockPanel />
      </Suspense>
      <Link href={SIGNED_IN_PATH} className="mt-8 inline-block underline">
        {BACK_LINK}
      </Link>
    </main>
  );
}

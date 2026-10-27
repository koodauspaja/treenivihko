import Link from "next/link";
import { Suspense } from "react";
import { NicknamePanel } from "@/components/nickname-panel";
import { BACK_LINK, NICKNAME_LINK } from "@/lib/trainer/messages";
import { TRAINER_PATH } from "@/lib/trainer/paths";

export default function NicknamePage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold">{NICKNAME_LINK}</h1>
      <Suspense fallback={<p className="mt-4">Ladataan…</p>}>
        <NicknamePanel />
      </Suspense>
      <Link href={TRAINER_PATH} className="mt-8 inline-block underline">
        {BACK_LINK}
      </Link>
    </main>
  );
}

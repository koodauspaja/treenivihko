import Link from "next/link";
import { lockTrainerSide } from "@/app/trainer/actions";
import { SignOutButton } from "@/components/sign-out-button";
import { TrainerTimeout } from "@/components/trainer-timeout";
import { requireTrainer } from "@/lib/trainer/access";
import { EXERCISES_LINK, LOCK_BUTTON, NICKNAME_LINK } from "@/lib/trainer/messages";
import { EXERCISES_PATH, NICKNAME_PATH } from "@/lib/trainer/paths";

/**
 * The trainer side's menu, only behind an unlock. Leaving it for the child's
 * side locks it, so the child's side is always safe to hand back.
 *
 * decisions/f001-trainer-side.md
 * decisions/f002-exercise-library.md
 */
export async function TrainerPanel() {
  const { expiresAt } = await requireTrainer();
  return (
    <>
      <TrainerTimeout expiresAt={expiresAt.toISOString()} />
      <nav className="mt-6 flex flex-col gap-3">
        <Link href={EXERCISES_PATH} className="underline">
          {EXERCISES_LINK}
        </Link>
        <Link href={NICKNAME_PATH} className="underline">
          {NICKNAME_LINK}
        </Link>
      </nav>
      <div className="mt-8 flex flex-wrap gap-3">
        <form action={lockTrainerSide}>
          <button type="submit" className="rounded border px-4 py-2">
            {LOCK_BUTTON}
          </button>
        </form>
        <SignOutButton />
      </div>
    </>
  );
}

import { lockTrainerSide } from "@/app/trainer/actions";
import { NicknameForm } from "@/components/nickname-form";
import { SignOutButton } from "@/components/sign-out-button";
import { TrainerTimeout } from "@/components/trainer-timeout";
import { requireTrainer } from "@/lib/trainer/access";
import { LOCK_BUTTON } from "@/lib/trainer/messages";
import { ensureChild } from "@/lib/trainer/store";

/** The trainer side's first page, only behind an unlock. decisions/f001-trainer-side.md */
export async function TrainerPanel() {
  const { user, expiresAt } = await requireTrainer();
  const child = await ensureChild(user.id);
  return (
    <>
      <TrainerTimeout expiresAt={expiresAt.toISOString()} />
      <NicknameForm nickname={child.nickname} />
      <div className="mt-8 flex gap-3">
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

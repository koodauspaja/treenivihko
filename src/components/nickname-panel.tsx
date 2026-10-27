import { NicknameForm } from "@/components/nickname-form";
import { TrainerTimeout } from "@/components/trainer-timeout";
import { requireTrainer } from "@/lib/trainer/access";
import { ensureChild } from "@/lib/trainer/store";

/** The child's nickname, on the trainer side behind its unlock. decisions/f002-exercise-library.md */
export async function NicknamePanel() {
  const { user, expiresAt } = await requireTrainer();
  const child = await ensureChild(user.id);
  return (
    <>
      <TrainerTimeout expiresAt={expiresAt.toISOString()} />
      <NicknameForm nickname={child.nickname} />
    </>
  );
}

import Link from "next/link";
import { Notebook } from "@/components/notebook";
import { StreakLines } from "@/components/streak";
import { requireUser } from "@/lib/auth/session";
import { PROGRESS_PATH } from "@/lib/notebook/paths";
import { PROGRESS } from "@/lib/progress/messages";
import { greeting, TRAINER_LINK } from "@/lib/trainer/messages";
import { TRAINER_PATH } from "@/lib/trainer/paths";
import { ensureChild } from "@/lib/trainer/store";

/**
 * The child's side, where sign-in lands: the child greeted by nickname, their
 * streak, the period to copy into the notebook, the way to their progress,
 * and the way to the trainer side, which asks for its password. It shows
 * nothing of the parent's but the periods and the pauses' days, and only to
 * a signed-in browser.
 *
 * decisions/029-sign-in.md
 * decisions/f001-trainer-side.md
 * decisions/f005-notebook-view.md
 * decisions/f007-progress.md
 * decisions/f008-streaks-and-accomplishments.md
 * decisions/054-unlock-after-child-link.md
 */
export async function SignedInPanel() {
  const user = await requireUser();
  const child = await ensureChild(user.id);
  return (
    <>
      <h2 className="mt-6 text-2xl font-semibold">{greeting(child.nickname)}</h2>
      <StreakLines userId={user.id} />
      <Notebook userId={user.id} />
      <Link href={PROGRESS_PATH} className="mt-10 block underline">
        {PROGRESS}
      </Link>
      {/* A full load: a client navigation would keep the lock page as where the trainer side leads. */}
      <a href={TRAINER_PATH} className="mt-12 block text-sm underline">
        {TRAINER_LINK}
      </a>
    </>
  );
}

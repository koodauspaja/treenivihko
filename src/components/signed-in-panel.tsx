import Link from "next/link";
import { Notebook } from "@/components/notebook";
import { requireUser } from "@/lib/auth/session";
import { greeting, TRAINER_LINK } from "@/lib/trainer/messages";
import { TRAINER_PATH } from "@/lib/trainer/paths";
import { ensureChild } from "@/lib/trainer/store";

/**
 * The child's side, where sign-in lands: the child greeted by nickname, the
 * period to copy into the notebook, and the way to the trainer side, which
 * asks for its password. It shows nothing of the parent's but the period,
 * and only to a signed-in browser.
 *
 * decisions/029-sign-in.md
 * decisions/f001-trainer-side.md
 * decisions/f005-notebook-view.md
 */
export async function SignedInPanel() {
  const user = await requireUser();
  const child = await ensureChild(user.id);
  return (
    <>
      <h2 className="mt-6 text-2xl font-semibold">{greeting(child.nickname)}</h2>
      <Notebook userId={user.id} />
      <Link href={TRAINER_PATH} className="mt-12 block text-sm underline">
        {TRAINER_LINK}
      </Link>
    </>
  );
}

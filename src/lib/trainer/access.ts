/**
 * The check every trainer page and action makes on the server: a signed-in
 * user whose browser has an unlock that has not ended, which using it moves
 * on. Without one, the lock page.
 *
 * decisions/f001-trainer-side.md
 */

import { redirect } from "next/navigation";
import { requireUser, type SignedInUser } from "@/lib/auth/session";
import { UNLOCK_PATH } from "./paths";
import { touchUnlock } from "./store";

export type Trainer = { user: SignedInUser; expiresAt: Date };

/** The unlocked trainer, or a redirect: to sign-in without a user, to the lock page without an unlock. */
export async function requireTrainer(now?: Date): Promise<Trainer> {
  const user = await requireUser();
  // Read after the request is, as Next requires of the time during a render.
  const expiresAt = await touchUnlock(user.sessionId, now ?? new Date());
  if (expiresAt === null) {
    redirect(UNLOCK_PATH);
  }
  return { user, expiresAt };
}

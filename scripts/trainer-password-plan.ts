/**
 * What `npm run trainer:set-password` does with what it was given: whose
 * password to set, or why it refuses. The app has one parent, so it sets the
 * only user's, and refuses rather than guess when there is not exactly one.
 *
 * decisions/f001-trainer-side.md
 */

import { passwordRefusal } from "../src/lib/trainer/rules.ts";

export type PasswordPlan = { ok: true; userId: string } | { ok: false; refusal: string };

/** The user whose password to set, from the users' ids and the two passwords typed. */
export function planPasswordChange(
  userIds: readonly string[],
  password: string,
  repeated: string
): PasswordPlan {
  if (userIds.length !== 1) {
    return {
      ok: false,
      refusal: `expected exactly one user, found ${userIds.length}: sign in with Google first`,
    };
  }
  const refusal = passwordRefusal(password, repeated);
  return refusal === null ? { ok: true, userId: userIds[0] as string } : { ok: false, refusal };
}

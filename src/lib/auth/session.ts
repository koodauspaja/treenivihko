/**
 * The signed-in user, read at request time. A request without Better Auth's
 * session cookie is answered without the auth server, so a signed-out page
 * needs none of sign-in's variables and no database. A session whose address
 * has left the allowlist counts as signed out, though Better Auth would renew it.
 *
 * decisions/029-sign-in.md
 */

import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAllowed } from "./allowlist";
import { SIGN_IN_PATH } from "./paths";
import { getAuth } from "./server";

/** What a page needs of the user, and no more: no address, no token. */
export type SignedInUser = { id: string; name: string };

/** The signed-in user, or null. */
export async function currentUser(): Promise<SignedInUser | null> {
  const requestHeaders = await headers();
  if (getSessionCookie(requestHeaders) === null) {
    return null;
  }
  const found = await getAuth().api.getSession({ headers: requestHeaders });
  if (!found || !isAllowed(found.user.email, process.env.AUTH_ALLOWED_EMAILS)) {
    return null;
  }
  return { id: found.user.id, name: found.user.name };
}

/** The signed-in user, or a redirect to the sign-in page. */
export async function requireUser(): Promise<SignedInUser> {
  const user = await currentUser();
  if (user === null) {
    redirect(SIGN_IN_PATH);
  }
  return user;
}

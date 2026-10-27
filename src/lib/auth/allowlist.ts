/**
 * Who may sign in: the addresses in `AUTH_ALLOWED_EMAILS`, comma-separated.
 * Google's test-user list restricts nobody for an app that asks only for name
 * and email, so this list is the only gate, and an empty one lets nobody in.
 *
 * decisions/029-sign-in.md
 */

/** The code a refused sign-in carries back to the sign-in page; the page picks the Finnish. */
export const SIGN_IN_NOT_ALLOWED = "sign_in_not_allowed";

/** The configured addresses, lower-cased and trimmed, blanks dropped. */
export function allowedEmails(configured: string | undefined): string[] {
  return (configured ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry !== "");
}

/** Whether this identity's address is on the list. Anything that is not an address is not. */
export function isAllowed(email: unknown, configured: string | undefined): boolean {
  return (
    typeof email === "string" && allowedEmails(configured).includes(email.trim().toLowerCase())
  );
}

/** A refusal or a new user is one line on stderr, which Railway keeps in its log; never the address. */
export const toStderr = (line: string) => {
  process.stderr.write(`${line}\n`);
};

/** The identity Better Auth is about to let in, and how it arrived. */
export type Identity = { email?: unknown; emailVerified?: unknown; method: string };

/**
 * Better Auth's `user.validateUserInfo` answer: nothing to let the identity in,
 * `{ error }` to refuse it. It runs before a user is created, before an account
 * is linked, and on every Google sign-in. An address Google has not verified
 * is refused too: anyone can put an address on a Google account.
 */
export function signInRefusal(
  identity: Identity,
  configured: string | undefined,
  report: (line: string) => void = toStderr
): { error: string } | undefined {
  if (!isAllowed(identity.email, configured)) {
    report("sign-in refused: the address is not on the allowlist");
    return { error: SIGN_IN_NOT_ALLOWED };
  }
  if (identity.method === "oauth" && identity.emailVerified !== true) {
    report("sign-in refused: the provider has not verified the address");
    return { error: SIGN_IN_NOT_ALLOWED };
  }
  return undefined;
}

/** The record of a user being created: its id, and nothing that names the person. */
export function reportUserCreated(id: string, report: (line: string) => void = toStderr): void {
  report(`sign-in: user ${id} created`);
}

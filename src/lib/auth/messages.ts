/**
 * The Finnish a reader sees when sign-in fails, chosen by the code Better Auth
 * puts in the address. decisions/029-sign-in.md
 */

import { SIGN_IN_NOT_ALLOWED } from "./allowlist";

export const NOT_ALLOWED_MESSAGE = "Tällä Google-tilillä ei voi kirjautua Treenivihkoon.";
export const FAILED_MESSAGE = "Kirjautuminen ei onnistunut. Yritä uudelleen.";

/** The message for an `error` query value, or null when there is none. */
export function signInErrorMessage(error: string | string[] | undefined): string | null {
  const codes = (Array.isArray(error) ? error : [error]).filter(
    (code): code is string => typeof code === "string" && code !== ""
  );
  if (codes.length === 0) {
    return null;
  }
  return codes.includes(SIGN_IN_NOT_ALLOWED) ? NOT_ALLOWED_MESSAGE : FAILED_MESSAGE;
}

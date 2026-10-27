/**
 * The trainer side's rules, apart from the database so each is tested on its
 * own: what a password and a nickname may be, when wrong tries lock the
 * password, and how long an unlock lasts.
 *
 * decisions/f001-trainer-side.md
 * decisions/f002-exercise-library.md
 */

import { characterCount, tidy } from "@/lib/text";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const NICKNAME_MAX_LENGTH = 20;

/** Wrong passwords in a row that lock it. */
export const LOCKOUT_ATTEMPTS = 5;

export const LOCKOUT_MINUTES = 15;

/** How long the trainer side stays open after its last request. */
export const UNLOCK_MINUTES = 15;

const MINUTE_MS = 60_000;

/** Why the command refuses a password, in English since it is a tool, or null. */
export function passwordRefusal(password: string, repeated: string): string | null {
  const length = characterCount(password);
  if (length < PASSWORD_MIN_LENGTH || length > PASSWORD_MAX_LENGTH) {
    return `a password is ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters`;
  }
  if (password !== repeated) {
    return "the two passwords differ";
  }
  return null;
}

/** The nickname to store, trimmed, or null when it is not 1 to 20 characters. */
export function nicknameFrom(input: unknown): string | null {
  if (typeof input !== "string") {
    return null;
  }
  const nickname = tidy(input);
  const length = characterCount(nickname);
  return length >= 1 && length <= NICKNAME_MAX_LENGTH ? nickname : null;
}

/** When an unlock made or used at `now` ends. */
export function unlockExpiry(now: Date): Date {
  return new Date(now.getTime() + UNLOCK_MINUTES * MINUTE_MS);
}

/** When a lockout that starts at `now` ends. */
export function lockoutEnd(now: Date): Date {
  return new Date(now.getTime() + LOCKOUT_MINUTES * MINUTE_MS);
}

/** Whether a password locked until `lockedUntil` is still locked at `now`. */
export function isLockedOut(lockedUntil: Date | null, now: Date): lockedUntil is Date {
  return lockedUntil !== null && lockedUntil.getTime() > now.getTime();
}

/** The whole minutes of a lockout left at `now`, rounded up, so never 0 while it lasts. */
export function minutesLeft(lockedUntil: Date, now: Date): number {
  return Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / MINUTE_MS));
}

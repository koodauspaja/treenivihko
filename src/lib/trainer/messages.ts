/**
 * The Finnish the trainer side and the child's side show, as the spec gives it.
 * decisions/f001-trainer-side.md
 */

import { minutesLeft } from "./rules";

export const TRAINER_HEADING = "Valmentaja";
export const TRAINER_LINK = "Valmentaja";

export const PASSWORD_LABEL = "Salasana";
export const UNLOCK_BUTTON = "Avaa";
export const BACK_LINK = "Takaisin";
export const WRONG_PASSWORD = "Väärä salasana.";
export const NO_PASSWORD_SET = "Valmentajan salasanaa ei ole vielä asetettu.";

/** The lockout message, with the whole minutes left. */
export const lockedOutMessage = (minutes: number) =>
  `Liian monta yritystä. Yritä uudelleen ${minutes} minuutin päästä.`;

export const NICKNAME_LABEL = "Lapsen nimi";
export const SAVE_BUTTON = "Tallenna";
export const SAVED = "Tallennettu.";
export const NICKNAME_REFUSED = "Nimessä on oltava 1–20 merkkiä.";
export const LOCK_BUTTON = "Lukitse";
export const SIGN_OUT_BUTTON = "Kirjaudu ulos";

/** The child's side's heading: by nickname once there is one. */
export const greeting = (nickname: string | null) =>
  nickname === null ? "Hei!" : `Hei, ${nickname}!`;

/**
 * Why the password did not open the trainer side, for the lock page and its
 * form. A password replaced while it was being tried reads as wrong.
 */
export function refusalMessage(
  result: { kind: "none" } | { kind: "locked"; until: Date } | { kind: "ready" | "wrong" },
  now: Date
): string {
  switch (result.kind) {
    case "none":
      return NO_PASSWORD_SET;
    case "locked":
      return lockedOutMessage(minutesLeft(result.until, now));
    default:
      return WRONG_PASSWORD;
  }
}

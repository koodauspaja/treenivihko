/**
 * The Finnish the trainer side and the child's side show, as the specs give it.
 *
 * decisions/f001-trainer-side.md
 * decisions/f002-exercise-library.md
 * decisions/f004-periods-and-sessions.md
 * decisions/f008-streaks-and-accomplishments.md
 */

import { minutesLeft } from "./rules";

export { BACK as BACK_LINK } from "@/lib/messages";

export const TRAINER_HEADING = "Valmentaja";
export const TRAINER_LINK = "Valmentaja";

export const PASSWORD_LABEL = "Salasana";
export const UNLOCK_BUTTON = "Avaa";
export const WRONG_PASSWORD = "Väärä salasana.";
export const NO_PASSWORD_SET = "Valmentajan salasanaa ei ole vielä asetettu.";

/** The lockout message, with the whole minutes left. */
export const lockedOutMessage = (minutes: number) =>
  `Liian monta yritystä. Yritä uudelleen ${minutes} minuutin päästä.`;

export const NICKNAME_LABEL = "Lapsen nimi";
export const SAVE_BUTTON = "Tallenna";
export const SAVED = "Tallennettu.";
export const NICKNAME_REFUSED = "Nimessä on oltava 1–20 merkkiä.";
export const LOCK_BUTTON = "Lukitse ja palaa";
export const PERIODS_LINK = "Jaksot";
export const PAUSES_LINK = "Tauot";
export const EXERCISES_LINK = "Harjoitteet";
export const NICKNAME_LINK = "Lapsen nimi";
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

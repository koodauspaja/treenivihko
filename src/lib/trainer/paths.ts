/**
 * The trainer side's public addresses, Finnish; the English folders behind
 * them are in `src/lib/routes.ts`.
 *
 * decisions/f001-trainer-side.md
 * decisions/f002-exercise-library.md
 * decisions/f003-exercise-import.md
 */

export const TRAINER_PATH = "/valmentaja";
export const UNLOCK_PATH = "/valmentaja/avaa";
export const NICKNAME_PATH = "/valmentaja/nimi";
export const EXERCISES_PATH = "/valmentaja/harjoitteet";
export const NEW_EXERCISE_PATH = "/valmentaja/harjoitteet/uusi";
export const IMPORT_PATH = "/valmentaja/harjoitteet/tuonti";

/** One exercise's page. */
export const exercisePath = (id: string) => `${EXERCISES_PATH}/${encodeURIComponent(id)}`;

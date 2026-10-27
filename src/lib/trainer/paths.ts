/**
 * The trainer side's public addresses, Finnish; the English folders behind
 * them are in `src/lib/routes.ts`.
 *
 * decisions/f001-trainer-side.md
 * decisions/f002-exercise-library.md
 * decisions/f003-exercise-import.md
 * decisions/f004-periods-and-sessions.md
 */

export const TRAINER_PATH = "/valmentaja";
export const UNLOCK_PATH = "/valmentaja/avaa";
export const NICKNAME_PATH = "/valmentaja/nimi";
export const EXERCISES_PATH = "/valmentaja/harjoitteet";
export const NEW_EXERCISE_PATH = "/valmentaja/harjoitteet/uusi";
export const IMPORT_PATH = "/valmentaja/harjoitteet/tuonti";

/** One exercise's page. */
export const exercisePath = (id: string) => `${EXERCISES_PATH}/${encodeURIComponent(id)}`;

export const PERIODS_PATH = "/valmentaja/jaksot";
export const NEW_PERIOD_PATH = "/valmentaja/jaksot/uusi";

/** One period's page. */
export const periodPath = (id: string) => `${PERIODS_PATH}/${encodeURIComponent(id)}`;

/** One session's page. */
export const sessionPath = (id: string) => `/valmentaja/treenit/${encodeURIComponent(id)}`;

/** The exercise picker for one block of a session. */
export const pickerPath = (sessionId: string, blockId: string) =>
  `${sessionPath(sessionId)}/lisaa/${encodeURIComponent(blockId)}`;

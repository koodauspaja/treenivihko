/**
 * The child's side's addresses, Finnish; their English folders are rows in
 * `src/lib/routes.ts`.
 *
 * decisions/029-sign-in.md
 * decisions/f005-notebook-view.md
 * decisions/f006-session-marks.md
 * decisions/f007-progress.md
 */

/** One exercise as it is in a block of the period shown. */
export const notebookExercisePath = (blockExerciseId: string) =>
  `/harjoite/${encodeURIComponent(blockExerciseId)}`;

/** A session's marking page. */
export const markPath = (sessionId: string) => `/treeni/${encodeURIComponent(sessionId)}`;

/** The child's progress. */
export const PROGRESS_PATH = "/omat-treenit";

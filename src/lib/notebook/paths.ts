/**
 * The child's side's addresses, Finnish; their English folders are rows in
 * `src/lib/routes.ts`.
 *
 * decisions/f005-notebook-view.md
 */

/** One exercise as it is in a block of the period shown. */
export const notebookExercisePath = (blockExerciseId: string) =>
  `/harjoite/${encodeURIComponent(blockExerciseId)}`;

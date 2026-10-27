/**
 * How a database write leaves its record when it fails: the event, its ids
 * and Postgres's reason, on one line, and nothing of the query's values, which
 * Drizzle's own message carries (a password's hash, a nickname, an exercise's
 * text).
 *
 * decisions/f001-trainer-side.md
 * decisions/f002-exercise-library.md
 */

export type Report = (line: string) => void;

/** Postgres's reason for a failure, without the query. */
export function reasonOf(error: unknown): string {
  if (error instanceof Error && error.cause instanceof Error) {
    return error.cause.message;
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs `work`; on a failure, logs the event, its ids and the reason, and
 * passes on an error that carries no more than that, since Next logs it too.
 */
export async function logged<T>(
  event: string,
  ids: string,
  report: Report,
  work: () => Promise<T>
): Promise<T> {
  try {
    return await work();
  } catch (error) {
    const line = `${event} failed: ${ids}: ${reasonOf(error)}`;
    report(line);
    throw new Error(line);
  }
}

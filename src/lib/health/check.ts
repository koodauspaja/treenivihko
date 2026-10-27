/**
 * What the health route answers: whether the database answers, and which
 * commit is running. Railway sends no traffic to a deploy until it is "ok".
 *
 * decisions/026-railway.md
 */

/** How long the database has to answer before the check calls it unreachable. */
export const DATABASE_TIMEOUT_MS = 3_000;

export type Health = {
  status: "ok" | "unavailable";
  database: "ok" | "unreachable";
  /** The deployed commit, or null where none is set, as on a local build. */
  commit: string | null;
};

/** Where a failed check is recorded: one line on stderr, which Railway keeps in its log. */
const toStderr = (line: string) => {
  process.stderr.write(`${line}\n`);
};

/** An error's message, followed by its cause's: Drizzle wraps the driver's reason in a cause. */
function reasonFor(error: unknown): string {
  if (!(error instanceof Error)) {
    return typeof error === "string" ? error : "a value that is not an Error";
  }
  return error.cause instanceof Error ? `${error.message}: ${error.cause.message}` : error.message;
}

/** Asks the database through `ping`, giving up after `timeoutMs`. */
export async function checkHealth(
  ping: () => Promise<unknown>,
  commit: string | undefined,
  { timeoutMs = DATABASE_TIMEOUT_MS, report = toStderr } = {}
): Promise<Health> {
  const deployed = commit?.trim() || null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no answer in ${timeoutMs} ms`)), timeoutMs);
  });
  try {
    await Promise.race([ping(), timeout]);
    return { status: "ok", database: "ok", commit: deployed };
  } catch (error) {
    report(`health check: the database did not answer: ${reasonFor(error)}`);
    return { status: "unavailable", database: "unreachable", commit: deployed };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Two writes at once, in a known order, for the integration tests' races: one
 * holds its locks in an open transaction until the other waits on them.
 */

import { sql } from "drizzle-orm";
import { getDatabase } from "../../src/lib/db/index.ts";

type Database = ReturnType<typeof getDatabase>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Whether a session waits on a lock the session `holder` holds, not on any other. */
const waitingOn = async (holder: number) => {
  const [row] = await getDatabase().execute<{ waiting: number }>(
    sql`select count(*)::int as waiting from pg_stat_activity where ${holder} = any(pg_blocking_pids(pid))`
  );
  return (row?.waiting ?? 0) > 0;
};

/**
 * What `act` comes to when `write` is in a transaction left open until `act`
 * waits on its locks, and committed then: two writes at once, in that order.
 */
export const whileHeld = async <T>(
  write: (tx: Transaction) => Promise<unknown>,
  act: () => Promise<T>
) => {
  let holder = 0;
  let written = () => {};
  let release = () => {};
  const done = new Promise<void>((resolve) => {
    written = resolve;
  });
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const held = getDatabase().transaction(async (tx) => {
    const [session] = await tx.execute<{ pid: number }>(sql`select pg_backend_pid() as pid`);
    holder = session?.pid ?? 0;
    await write(tx);
    written();
    await released;
  });
  // A write that fails, or an act that never waits, ends the test rather than hanging it.
  await Promise.race([done, held]);
  let settled = false;
  const acting = act();
  const settle = () => {
    settled = true;
  };
  acting.then(settle, settle);
  while (!settled && !(await waitingOn(holder))) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  release();
  await held;
  return acting;
};

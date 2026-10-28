/**
 * Deletes users and everything theirs. Their exercises and their periods go by
 * two cascades, and the first can reach an exercise before the second has
 * removed the block exercises using it, or clear a mark's pick after the second
 * has removed its session, so the keys between them are deferred to the
 * commit, when both have run.
 *
 * decisions/f004-periods-and-sessions.md
 * decisions/f006-session-marks.md
 */

import { type SQL, sql } from "drizzle-orm";
import { getDatabase } from "../../src/lib/db/index.ts";
import { user } from "../../src/lib/db/schema.ts";

export const deleteUsers = (where?: SQL) =>
  getDatabase().transaction(async (tx) => {
    await tx.execute(
      sql`set constraints block_exercise_exercise_id_exercise_id_fk, session_mark_session_id_training_session_id_fk deferred`
    );
    await tx.delete(user).where(where);
  });

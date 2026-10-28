/**
 * The progress's reads, always within one parent's own periods, each in one
 * read-only snapshot: the child's progress on a day, and a period's marks
 * for the trainer side. Nothing here writes.
 *
 * decisions/f004-periods-and-sessions.md
 * decisions/f006-session-marks.md
 * decisions/f007-progress.md
 */

import { and, asc, eq, inArray } from "drizzle-orm";
import { toStderr } from "@/lib/auth/allowlist";
import { isRowId } from "@/lib/db/ids";
import { type Database, getDatabase } from "@/lib/db/index";
import { logged, type Report } from "@/lib/db/logged";
import { exercise, period, sessionMark, trainingSession } from "@/lib/db/schema";
import { PICKS, type PickKey, type Status } from "@/lib/marks/rules";
import type { MarkSummary } from "@/lib/marks/store";
import type { PeriodRow } from "@/lib/periods/store";
import { countPicks, type ExerciseCounts, ranked, startedOf } from "./rules";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type SessionProgress = { id: string; position: number; mark: MarkSummary | null };
export type PeriodProgress = PeriodRow & { sessions: SessionProgress[] };
export type Progress = { periods: PeriodProgress[]; exercises: ExerciseCounts[] };

/** A mark as the trainer side shows it: its line's values, and each pick's exercise by name. */
export type MarkDetail = MarkSummary & { picks: Record<PickKey, string | null> };

const snapshot = <T>(read: (tx: Transaction) => Promise<T>) =>
  getDatabase().transaction(read, { isolationLevel: "repeatable read", accessMode: "read only" });

const markColumns = {
  status: sessionMark.status,
  trainedOn: sessionMark.trainedOn,
  feeling: sessionMark.feeling,
  likedBest: sessionMark.likedBestExerciseId,
  likedLeast: sessionMark.likedLeastExerciseId,
  easiest: sessionMark.easiestExerciseId,
  hardest: sessionMark.hardestExerciseId,
};

/** The current names of the parent's exercises among `ids`. */
const namesOf = async (tx: Transaction, userId: string, ids: readonly string[]) => {
  if (ids.length === 0) {
    return new Map<string, string>();
  }
  const rows = await tx
    .select({ id: exercise.id, name: exercise.name })
    .from(exercise)
    .where(and(eq(exercise.userId, userId), inArray(exercise.id, [...ids])));
  return new Map(rows.map((row) => [row.id, row.name]));
};

/**
 * The child's progress on `day`: the periods that have started, newest
 * first, each with its sessions in order and their marks; then every
 * exercise their marks pick, with its counts, in the spec's order.
 */
export function getProgress(userId: string, day: string, report: Report = toStderr) {
  return logged("progress read", `user ${userId}`, report, () =>
    snapshot(async (tx): Promise<Progress> => {
      const periods = startedOf(
        await tx
          .select({ id: period.id, startsOn: period.startsOn, weeks: period.weeks })
          .from(period)
          .where(eq(period.userId, userId)),
        day
      );
      if (periods.length === 0) {
        return { periods: [], exercises: [] };
      }
      const rows = await tx
        .select({
          id: trainingSession.id,
          periodId: trainingSession.periodId,
          position: trainingSession.position,
          ...markColumns,
        })
        .from(trainingSession)
        .leftJoin(sessionMark, eq(sessionMark.sessionId, trainingSession.id))
        .where(
          inArray(
            trainingSession.periodId,
            periods.map((each) => each.id)
          )
        )
        .orderBy(asc(trainingSession.position));
      const counts = countPicks(rows);
      const names = await namesOf(tx, userId, [...counts.keys()]);
      const exercises: ExerciseCounts[] = [];
      for (const [exerciseId, each] of counts) {
        const name = names.get(exerciseId);
        if (name !== undefined) {
          exercises.push({ exerciseId, name, counts: each });
        }
      }
      return {
        periods: periods.map((each) => ({
          ...each,
          sessions: rows
            .filter((row) => row.periodId === each.id)
            .map((row) => ({
              id: row.id,
              position: row.position,
              mark:
                row.status === null
                  ? null
                  : {
                      status: row.status as Status,
                      trainedOn: row.trainedOn,
                      feeling: row.feeling,
                    },
            })),
        })),
        exercises: ranked(exercises),
      };
    })
  );
}

/** The marks of one of the parent's periods, by session id; another's has none. */
export function getPeriodMarks(
  userId: string,
  periodId: string,
  report: Report = toStderr
): Promise<Record<string, MarkDetail>> {
  if (!isRowId(periodId)) {
    return Promise.resolve({});
  }
  return logged("period marks read", `user ${userId}, period ${periodId}`, report, () =>
    snapshot(async (tx) => {
      const rows = await tx
        .select({ sessionId: sessionMark.sessionId, ...markColumns })
        .from(sessionMark)
        .innerJoin(trainingSession, eq(trainingSession.id, sessionMark.sessionId))
        .innerJoin(period, eq(period.id, trainingSession.periodId))
        .where(and(eq(period.userId, userId), eq(period.id, periodId)));
      const picked = rows.flatMap((row) =>
        PICKS.map((pick) => row[pick]).filter((id) => id !== null)
      );
      const names = await namesOf(tx, userId, [...new Set(picked)]);
      const nameOf = (id: string | null) => (id === null ? null : (names.get(id) ?? null));
      const marks: Record<string, MarkDetail> = {};
      for (const row of rows) {
        marks[row.sessionId] = {
          status: row.status as Status,
          trainedOn: row.trainedOn,
          feeling: row.feeling,
          picks: {
            likedBest: nameOf(row.likedBest),
            likedLeast: nameOf(row.likedLeast),
            easiest: nameOf(row.easiest),
            hardest: nameOf(row.hardest),
          },
        };
      }
      return marks;
    })
  );
}

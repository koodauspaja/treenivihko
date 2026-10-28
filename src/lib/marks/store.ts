/**
 * The marks' reads and writes, always within one parent's own sessions, and
 * only in a period the child may mark on the day. A read of several
 * statements runs in one read-only snapshot. A write holds its session and
 * its picked exercises against deletion until it commits. Each write logs
 * ids only.
 *
 * decisions/f004-periods-and-sessions.md
 * decisions/f006-session-marks.md
 */

import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { toStderr } from "@/lib/auth/allowlist";
import { isRowId } from "@/lib/db/ids";
import { type Database, getDatabase } from "@/lib/db/index";
import { logged, type Report } from "@/lib/db/logged";
import {
  block,
  blockExercise,
  exercise,
  period,
  sessionMark,
  trainingSession,
} from "@/lib/db/schema";
import type { PeriodDates } from "@/lib/periods/rules";
import { type Mark, markableOf, PICKS, pickOptions, type Status } from "./rules";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type PeriodRow = PeriodDates & { id: string };

/** What the child's side shows of a mark. */
export type MarkSummary = { status: Status; trainedOn: string | null; feeling: number | null };

export type ChildMarks = {
  /** Each marked session's mark, by its id, in the periods the child may mark. */
  marks: Record<string, MarkSummary>;
  /** The latest period that ended, with its sessions in order, or null. */
  previous: { period: PeriodRow; sessions: { id: string; position: number }[] } | null;
};

export type MarkPage = {
  id: string;
  position: number;
  period: PeriodRow;
  /** The session's library exercises, each once, in the session's order. */
  exercises: { exerciseId: string; name: string }[];
  mark: Mark | null;
};

export type MarkWrite =
  | { kind: "saved" }
  | { kind: "missing" }
  | { kind: "early" }
  | { kind: "stale" };

/** A read of several statements, in one snapshot so a write cannot land between them. */
const snapshot = <T>(read: (tx: Transaction) => Promise<T>) =>
  getDatabase().transaction(read, { isolationLevel: "repeatable read", accessMode: "read only" });

/** The periods the parent's child may mark on `day`. */
const markablePeriods = async (tx: Transaction, userId: string, day: string) => {
  const periods = await tx
    .select({ id: period.id, startsOn: period.startsOn, weeks: period.weeks })
    .from(period)
    .where(eq(period.userId, userId));
  const { current, previous } = markableOf(periods, day);
  return { current, previous, all: [current, previous].filter((each) => each !== undefined) };
};

/**
 * One of the parent's sessions in a markable period, with that period; null
 * for any other. `hold` keeps it from being deleted until the write commits.
 */
const markableSession = async (
  tx: Transaction,
  userId: string,
  id: string,
  day: string,
  hold: boolean
) => {
  const { all } = await markablePeriods(tx, userId, day);
  if (all.length === 0) {
    return null;
  }
  const query = tx
    .select({ id: trainingSession.id, position: trainingSession.position, periodId: period.id })
    .from(trainingSession)
    .innerJoin(period, eq(period.id, trainingSession.periodId))
    .where(
      and(
        eq(period.userId, userId),
        eq(trainingSession.id, id),
        inArray(
          period.id,
          all.map((each) => each.id)
        )
      )
    );
  const [found] = await (hold ? query.for("key share", { of: trainingSession }) : query);
  if (found === undefined) {
    return null;
  }
  return { ...found, period: all.find((each) => each.id === found.periodId) as PeriodRow };
};

const markColumns = {
  status: sessionMark.status,
  trainedOn: sessionMark.trainedOn,
  feeling: sessionMark.feeling,
  likedBest: sessionMark.likedBestExerciseId,
  likedLeast: sessionMark.likedLeastExerciseId,
  easiest: sessionMark.easiestExerciseId,
  hardest: sessionMark.hardestExerciseId,
};

/** The marks of the periods the child may mark on `day`, and the previous one's sessions. */
export function getChildMarks(userId: string, day: string, report: Report = toStderr) {
  return logged("session mark list", `user ${userId}`, report, () =>
    snapshot(async (tx): Promise<ChildMarks> => {
      const { previous, all } = await markablePeriods(tx, userId, day);
      if (all.length === 0) {
        return { marks: {}, previous: null };
      }
      const rows = await tx
        .select({
          sessionId: sessionMark.sessionId,
          status: sessionMark.status,
          trainedOn: sessionMark.trainedOn,
          feeling: sessionMark.feeling,
        })
        .from(sessionMark)
        .innerJoin(trainingSession, eq(trainingSession.id, sessionMark.sessionId))
        .where(
          inArray(
            trainingSession.periodId,
            all.map((each) => each.id)
          )
        );
      const marks: Record<string, MarkSummary> = {};
      for (const { sessionId, ...mark } of rows) {
        marks[sessionId] = { ...mark, status: mark.status as Status };
      }
      if (previous === undefined) {
        return { marks, previous: null };
      }
      const sessions = await tx
        .select({ id: trainingSession.id, position: trainingSession.position })
        .from(trainingSession)
        .where(eq(trainingSession.periodId, previous.id))
        .orderBy(asc(trainingSession.position));
      return { marks, previous: { period: previous, sessions } };
    })
  );
}

/** A session's marking page on `day`: its period, its exercises and its mark; null when it cannot be marked. */
export function getMarkPage(userId: string, id: string, day: string, report: Report = toStderr) {
  if (!isRowId(id)) {
    return Promise.resolve(null);
  }
  return logged("session mark read", `user ${userId}, session ${id}`, report, () =>
    snapshot(async (tx): Promise<MarkPage | null> => {
      const found = await markableSession(tx, userId, id, day, false);
      if (found === null) {
        return null;
      }
      const exercises = await tx
        .select({ exerciseId: exercise.id, name: exercise.name })
        .from(blockExercise)
        .innerJoin(block, eq(block.id, blockExercise.blockId))
        .innerJoin(exercise, eq(exercise.id, blockExercise.exerciseId))
        .where(eq(block.sessionId, id))
        .orderBy(asc(block.position), asc(blockExercise.position));
      const [saved] = await tx
        .select(markColumns)
        .from(sessionMark)
        .where(eq(sessionMark.sessionId, id));
      return {
        id: found.id,
        position: found.position,
        period: found.period,
        exercises: pickOptions(exercises),
        mark:
          saved === undefined
            ? null
            : {
                status: saved.status as Status,
                trainedOn: saved.trainedOn,
                feeling: saved.feeling,
                picks: {
                  likedBest: saved.likedBest,
                  likedLeast: saved.likedLeast,
                  easiest: saved.easiest,
                  hardest: saved.hardest,
                },
              },
      };
    })
  );
}

/**
 * Whether every picked exercise is in the session now, holding each against
 * deletion until the write commits.
 */
const picksInSession = async (tx: Transaction, sessionId: string, mark: Mark) => {
  const picked = [...new Set(PICKS.map((pick) => mark.picks[pick]).filter((id) => id !== null))];
  if (picked.length === 0) {
    return true;
  }
  if (!picked.every(isRowId)) {
    return false;
  }
  const found = await tx
    .select({ id: exercise.id })
    .from(exercise)
    .where(inArray(exercise.id, picked))
    .for("key share");
  const inSession = await tx
    .selectDistinct({ id: blockExercise.exerciseId })
    .from(blockExercise)
    .innerJoin(block, eq(block.id, blockExercise.blockId))
    .where(and(eq(block.sessionId, sessionId), inArray(blockExercise.exerciseId, picked)));
  return found.length === picked.length && inSession.length === picked.length;
};

/** Saves a session's mark on `day`, replacing any it had. */
export function saveMark(
  userId: string,
  id: string,
  mark: Mark,
  day: string,
  report: Report = toStderr
): Promise<MarkWrite> {
  if (!isRowId(id)) {
    return Promise.resolve({ kind: "missing" });
  }
  return logged("session mark saved", `user ${userId}, session ${id}`, report, async () => {
    const result = await getDatabase().transaction(async (tx): Promise<MarkWrite> => {
      const found = await markableSession(tx, userId, id, day, true);
      if (found === null) {
        return { kind: "missing" };
      }
      if (mark.trainedOn !== null && mark.trainedOn < found.period.startsOn) {
        return { kind: "early" };
      }
      if (!(await picksInSession(tx, id, mark))) {
        return { kind: "stale" };
      }
      const values = {
        status: mark.status,
        trainedOn: mark.trainedOn,
        feeling: mark.feeling,
        likedBestExerciseId: mark.picks.likedBest,
        likedLeastExerciseId: mark.picks.likedLeast,
        easiestExerciseId: mark.picks.easiest,
        hardestExerciseId: mark.picks.hardest,
      };
      await tx
        .insert(sessionMark)
        .values({ id: randomUUID(), sessionId: id, ...values })
        .onConflictDoUpdate({
          target: sessionMark.sessionId,
          set: { ...values, updatedAt: new Date() },
        });
      return { kind: "saved" };
    });
    if (result.kind === "saved") {
      report(`session mark saved: user ${userId}, session ${id}`);
    }
    return result;
  });
}

/** Removes a session's mark on `day`: whether it was removed, already gone, or the session cannot be marked. */
export function deleteMark(
  userId: string,
  id: string,
  day: string,
  report: Report = toStderr
): Promise<"deleted" | "absent" | "missing"> {
  if (!isRowId(id)) {
    return Promise.resolve("missing");
  }
  return logged("session mark deleted", `user ${userId}, session ${id}`, report, async () => {
    const result = await getDatabase().transaction(async (tx) => {
      if ((await markableSession(tx, userId, id, day, true)) === null) {
        return "missing" as const;
      }
      const removed = await tx
        .delete(sessionMark)
        .where(eq(sessionMark.sessionId, id))
        .returning({ id: sessionMark.id });
      return removed.length === 0 ? ("absent" as const) : ("deleted" as const);
    });
    if (result === "deleted") {
      report(`session mark deleted: user ${userId}, session ${id}`);
    }
    return result;
  });
}

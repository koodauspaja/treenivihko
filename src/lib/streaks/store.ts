/**
 * The pauses' reads and writes, and the streak's read, which records each
 * accomplishment it finds due: always within one parent's own data. The
 * facts are read in one read-only snapshot; what is due is inserted after
 * it, each kind and key once, whatever loads run at once. Each write logs
 * ids only.
 *
 * decisions/f004-periods-and-sessions.md
 * decisions/f006-session-marks.md
 * decisions/f008-streaks-and-accomplishments.md
 */

import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { toStderr } from "@/lib/auth/allowlist";
import { isRowId } from "@/lib/db/ids";
import { type Database, getDatabase } from "@/lib/db/index";
import { logged, type Report } from "@/lib/db/logged";
import {
  accomplishment,
  exercise,
  pause,
  period,
  sessionMark,
  trainingSession,
} from "@/lib/db/schema";
import type { Status } from "@/lib/marks/rules";
import type { Kind } from "./kinds";
import {
  byEarned,
  dueOf,
  type Earned,
  earnedKey,
  type MarkedSession,
  overlappingPause,
  type PauseDays,
  pauseOn,
  type Streak,
  sessionsDone,
  streakOf,
} from "./rules";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type PauseRow = PauseDays & { id: string };

export type PauseWrite =
  | { kind: "saved"; id: string }
  | { kind: "overlap"; with: PauseRow }
  | { kind: "missing" };

export type Achievements = {
  streak: Streak;
  /** The pause that includes the day, or null. */
  pause: PauseRow | null;
  /** The sessions done, in full or in part, over all periods. */
  done: number;
  /** Every accomplishment earned, newest first. */
  earned: Earned[];
};

const snapshot = <T>(read: (tx: Transaction) => Promise<T>) =>
  getDatabase().transaction(read, { isolationLevel: "repeatable read", accessMode: "read only" });

/** Whether a failure is the exclusion refusing a pause's days. */
const isOverlap = (error: unknown) =>
  error instanceof Error && (error.cause as { code?: unknown } | undefined)?.code === "23P01";

const pausesOf = (db: Pick<Database, "select">, userId: string): Promise<PauseRow[]> =>
  db
    .select({ id: pause.id, startsOn: pause.startsOn, endsOn: pause.endsOn })
    .from(pause)
    .where(eq(pause.userId, userId))
    .orderBy(desc(pause.startsOn));

/** The parent's pauses, the latest start first. */
export function listPauses(userId: string, report: Report = toStderr) {
  return logged("pause list", `user ${userId}`, report, () => pausesOf(getDatabase(), userId));
}

/** Adds a pause, refused by the exclusion when it shares a day with another of the parent's. */
export function createPause(
  userId: string,
  days: PauseDays,
  report: Report = toStderr
): Promise<PauseWrite> {
  return logged("pause created", `user ${userId}`, report, async () => {
    const id = randomUUID();
    try {
      await getDatabase()
        .insert(pause)
        .values({ id, userId, ...days });
    } catch (error) {
      if (!isOverlap(error)) {
        throw error;
      }
      // The exclusion refused it; the pause it overlapped may be gone again, and the refusal still stands.
      report(`pause refused, overlap: user ${userId}`);
      const other = overlappingPause(await pausesOf(getDatabase(), userId), days);
      return other === undefined ? { kind: "missing" } : { kind: "overlap", with: other };
    }
    report(`pause created: user ${userId}, pause ${id}`);
    return { kind: "saved", id };
  });
}

/** Deletes one of the parent's pauses; whether it was there. */
export function deletePause(userId: string, id: string, report: Report = toStderr) {
  if (!isRowId(id)) {
    return Promise.resolve(false);
  }
  return logged("pause deleted", `user ${userId}, pause ${id}`, report, async () => {
    const removed = await getDatabase()
      .delete(pause)
      .where(and(eq(pause.userId, userId), eq(pause.id, id)))
      .returning({ id: pause.id });
    if (removed.length > 0) {
      report(`pause deleted: user ${userId}, pause ${id}`);
    }
    return removed.length > 0;
  });
}

const earnedColumns = {
  id: accomplishment.id,
  kind: accomplishment.kind,
  earnedOn: accomplishment.earnedOn,
  periodStartsOn: accomplishment.periodStartsOn,
  periodWeeks: accomplishment.periodWeeks,
  exerciseName: accomplishment.exerciseName,
};

/** What the streak and the accomplishments are worked out from, in one snapshot. */
const factsOf = (userId: string, day: string) =>
  snapshot(async (tx) => {
    const periods = await tx
      .select({ id: period.id, startsOn: period.startsOn, weeks: period.weeks })
      .from(period)
      .where(eq(period.userId, userId));
    const sessions: MarkedSession[] = (
      await tx
        .select({
          periodId: trainingSession.periodId,
          status: sessionMark.status,
          trainedOn: sessionMark.trainedOn,
          easiest: sessionMark.easiestExerciseId,
          hardest: sessionMark.hardestExerciseId,
        })
        .from(trainingSession)
        .innerJoin(period, eq(period.id, trainingSession.periodId))
        .leftJoin(sessionMark, eq(sessionMark.sessionId, trainingSession.id))
        .where(eq(period.userId, userId))
    ).map((row) => ({ ...row, status: row.status as Status | null }));
    const pauses = await pausesOf(tx, userId);
    const earned = await tx
      .select({ kind: accomplishment.kind, key: accomplishment.key })
      .from(accomplishment)
      .where(eq(accomplishment.userId, userId));
    const streak = streakOf({
      day,
      doneDays: sessions
        .filter((each) => each.status === "done" || each.status === "partly")
        .map((each) => each.trainedOn as string),
      periods,
      pauses,
    });
    const due = dueOf({
      sessions,
      periods,
      best: streak.best,
      earned: new Set(earned.map(earnedKey)),
    });
    const exerciseIds = due.flatMap((each) => (each.exerciseId === null ? [] : [each.exerciseId]));
    const names =
      exerciseIds.length === 0
        ? []
        : await tx
            .select({ id: exercise.id, name: exercise.name })
            .from(exercise)
            .where(and(eq(exercise.userId, userId), inArray(exercise.id, exerciseIds)));
    return { sessions, pauses, streak, due, names: new Map(names.map((n) => [n.id, n.name])) };
  });

/**
 * The streak on `day`, the pause that includes it, the sessions done, and
 * every accomplishment earned, after recording what is due as earned on `day`.
 */
export function getAchievements(userId: string, day: string, report: Report = toStderr) {
  return logged("achievements read", `user ${userId}`, report, async (): Promise<Achievements> => {
    const facts = await factsOf(userId, day);
    const rows = facts.due.flatMap((each) => {
      const exerciseName = each.exerciseId === null ? null : facts.names.get(each.exerciseId);
      // An exercise deleted since the snapshot has no name to keep; it is due no longer.
      if (exerciseName === undefined) {
        return [];
      }
      return [
        {
          id: randomUUID(),
          userId,
          kind: each.kind,
          key: each.key,
          earnedOn: day,
          periodStartsOn: each.periodStartsOn,
          periodWeeks: each.periodWeeks,
          exerciseName,
        },
      ];
    });
    if (rows.length > 0) {
      const inserted = await getDatabase()
        .insert(accomplishment)
        .values(rows)
        .onConflictDoNothing({
          target: [accomplishment.userId, accomplishment.kind, accomplishment.key],
        })
        .returning({ id: accomplishment.id });
      for (const { id } of inserted) {
        report(`accomplishment earned: user ${userId}, accomplishment ${id}`);
      }
    }
    const earned = await getDatabase()
      .select(earnedColumns)
      .from(accomplishment)
      .where(eq(accomplishment.userId, userId));
    return {
      streak: facts.streak,
      pause: pauseOn(facts.pauses, day) ?? null,
      done: sessionsDone(facts.sessions),
      earned: earned.map((each) => ({ ...each, kind: each.kind as Kind })).sort(byEarned),
    };
  });
}

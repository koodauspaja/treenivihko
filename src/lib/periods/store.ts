/**
 * The periods' reads and writes, always within one parent's own. A read of
 * several statements runs in one read-only snapshot. A write locks the row
 * whose children it counts or renumbers, so two at once cannot both pass a
 * limit or take one position, and locks from the period down, so two cannot
 * deadlock; the database's exclusion decides an overlap. Each write logs ids
 * only.
 *
 * decisions/f002-exercise-library.md
 * decisions/f004-periods-and-sessions.md
 */

import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, type SQL, sql } from "drizzle-orm";
import { toStderr } from "@/lib/auth/allowlist";
import { isRowId } from "@/lib/db/ids";
import { type Database, getDatabase } from "@/lib/db/index";
import { logged, type Report } from "@/lib/db/logged";
import {
  block,
  blockExercise,
  exercise,
  exerciseLabel,
  period,
  trainingSession,
  trainingSessionEquipment,
} from "@/lib/db/schema";
import { inListOrder, type LabelKey } from "@/lib/exercises/labels";
import type { AmountKind } from "@/lib/exercises/rules";
import {
  BLOCK_EXERCISES_MAX,
  BLOCKS_MAX,
  latestOf,
  NEW_SESSION,
  overlapping,
  type PeriodDates,
  SESSIONS_MAX,
  type SessionSettings,
} from "./rules";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type PeriodRow = PeriodDates & { id: string };
export type PeriodSummary = PeriodRow & { sessionCount: number };
export type SessionSummary = {
  id: string;
  position: number;
  place: LabelKey;
  targetMinutes: number;
  totalMinutes: number;
};
export type PeriodDetail = PeriodRow & { sessions: SessionSummary[] };
export type BlockExerciseView = {
  id: string;
  position: number;
  exerciseId: string;
  name: string;
  amountKind: AmountKind;
  amount: number;
  durationMinutes: number;
  labels: LabelKey[];
};
export type BlockView = {
  id: string;
  position: number;
  theme: string;
  exercises: BlockExerciseView[];
};
export type SessionDetail = {
  id: string;
  position: number;
  place: LabelKey;
  equipment: LabelKey[];
  targetMinutes: number;
  period: PeriodRow;
  blocks: BlockView[];
};

export type Direction = "up" | "down";

/** Whether a failure is the exclusion refusing a period's days. */
const isOverlap = (error: unknown) =>
  error instanceof Error && (error.cause as { code?: unknown } | undefined)?.code === "23P01";

/** A read of several statements, in one snapshot so a write cannot land between them. */
const snapshot = <T>(read: (tx: Transaction) => Promise<T>) =>
  getDatabase().transaction(read, { isolationLevel: "repeatable read", accessMode: "read only" });

const owned = (userId: string) => eq(period.userId, userId);

const periodsOf = (db: Pick<Database, "select">, userId: string): Promise<PeriodRow[]> =>
  db
    .select({ id: period.id, startsOn: period.startsOn, weeks: period.weeks })
    .from(period)
    .where(owned(userId));

/** The parent's periods, newest first, each with its count of sessions. */
export function listPeriods(userId: string, report: Report = toStderr): Promise<PeriodSummary[]> {
  return logged("period list", `user ${userId}`, report, () =>
    getDatabase()
      .select({
        id: period.id,
        startsOn: period.startsOn,
        weeks: period.weeks,
        sessionCount: sql<number>`count(${trainingSession.id})::int`,
      })
      .from(period)
      .leftJoin(trainingSession, eq(trainingSession.periodId, period.id))
      .where(owned(userId))
      .groupBy(period.id)
      .orderBy(desc(period.startsOn))
  );
}

/** One of the parent's periods with its sessions in order, or null. */
export function getPeriod(userId: string, id: string, report: Report = toStderr) {
  if (!isRowId(id)) {
    return Promise.resolve(null);
  }
  return logged("period read", `user ${userId}, period ${id}`, report, () =>
    snapshot(async (tx): Promise<PeriodDetail | null> => {
      const [found] = await tx
        .select({ id: period.id, startsOn: period.startsOn, weeks: period.weeks })
        .from(period)
        .where(and(owned(userId), eq(period.id, id)));
      if (found === undefined) {
        return null;
      }
      const sessions = await tx
        .select({
          id: trainingSession.id,
          position: trainingSession.position,
          place: trainingSession.place,
          targetMinutes: trainingSession.targetMinutes,
          totalMinutes: sql<number>`coalesce(sum(${exercise.durationMinutes}), 0)::int`,
        })
        .from(trainingSession)
        .leftJoin(block, eq(block.sessionId, trainingSession.id))
        .leftJoin(blockExercise, eq(blockExercise.blockId, block.id))
        .leftJoin(exercise, eq(exercise.id, blockExercise.exerciseId))
        .where(eq(trainingSession.periodId, id))
        .groupBy(trainingSession.id)
        .orderBy(asc(trainingSession.position));
      return {
        ...found,
        sessions: sessions.map((each) => ({ ...each, place: each.place as LabelKey })),
      };
    })
  );
}

/** The parent's periods, for a new period's form: which it copies and follows. */
export function listPeriodDates(userId: string, report: Report = toStderr) {
  return logged("period list", `user ${userId}`, report, () => periodsOf(getDatabase(), userId));
}

export type PeriodWrite =
  | { kind: "saved"; id: string }
  | { kind: "overlap"; with: PeriodRow }
  | { kind: "missing" };

/** A write refused by the exclusion, told as the period it overlaps, found after the refusal. */
async function overlapOrThrow(
  error: unknown,
  userId: string,
  dates: PeriodDates,
  except: string | undefined,
  report: Report
): Promise<PeriodWrite> {
  if (!isOverlap(error)) {
    throw error;
  }
  report(`period refused, overlap: user ${userId}`);
  const other = overlapping(await periodsOf(getDatabase(), userId), dates, except);
  // The other period may be gone again by now; the refusal still stands.
  return other === undefined ? { kind: "missing" } : { kind: "overlap", with: other };
}

/** Copies `from`'s sessions, equipment, blocks and block exercises into `to`, in order. */
async function copySessions(tx: Transaction, from: string, to: string) {
  const sessions = await tx
    .select()
    .from(trainingSession)
    .where(eq(trainingSession.periodId, from))
    .orderBy(asc(trainingSession.position));
  if (sessions.length === 0) {
    return;
  }
  const sessionIds = new Map(sessions.map((each) => [each.id, randomUUID()]));
  const newSession = (id: string) => sessionIds.get(id) as string;
  await tx.insert(trainingSession).values(
    sessions.map((each) => ({
      id: newSession(each.id),
      periodId: to,
      position: each.position,
      place: each.place,
      targetMinutes: each.targetMinutes,
    }))
  );
  const old = [...sessionIds.keys()];
  const equipment = await tx
    .select()
    .from(trainingSessionEquipment)
    .where(inArray(trainingSessionEquipment.sessionId, old));
  if (equipment.length > 0) {
    await tx
      .insert(trainingSessionEquipment)
      .values(
        equipment.map((each) => ({ sessionId: newSession(each.sessionId), label: each.label }))
      );
  }
  const blocks = await tx.select().from(block).where(inArray(block.sessionId, old));
  if (blocks.length === 0) {
    return;
  }
  const blockIds = new Map(blocks.map((each) => [each.id, randomUUID()]));
  await tx.insert(block).values(
    blocks.map((each) => ({
      id: blockIds.get(each.id) as string,
      sessionId: newSession(each.sessionId),
      position: each.position,
      theme: each.theme,
    }))
  );
  const exercises = await tx
    .select()
    .from(blockExercise)
    .where(inArray(blockExercise.blockId, [...blockIds.keys()]));
  if (exercises.length > 0) {
    await tx.insert(blockExercise).values(
      exercises.map((each) => ({
        id: randomUUID(),
        blockId: blockIds.get(each.blockId) as string,
        exerciseId: each.exerciseId,
        position: each.position,
        amountKind: each.amountKind,
        amount: each.amount,
      }))
    );
  }
}

/**
 * Adds a period, as a copy of the one that ends last, in one transaction;
 * refused when its days overlap another's.
 */
export function createPeriod(
  userId: string,
  dates: PeriodDates,
  report: Report = toStderr
): Promise<PeriodWrite> {
  return logged("period created", `user ${userId}`, report, async () => {
    const id = randomUUID();
    try {
      const result = await getDatabase().transaction(
        async (tx) => {
          const periods = await periodsOf(tx, userId);
          const other = overlapping(periods, dates);
          if (other !== undefined) {
            return { kind: "overlap", with: other } as const;
          }
          const source = latestOf(periods);
          await tx.insert(period).values({ id, userId, ...dates });
          if (source !== undefined) {
            await copySessions(tx, source.id, id);
          }
          return { kind: "saved", id, from: source?.id } as const;
        },
        // One snapshot, so an edit of the latest period cannot land between the copy's reads.
        { isolationLevel: "repeatable read" }
      );
      if (result.kind === "overlap") {
        report(`period refused, overlap: user ${userId}`);
        return result;
      }
      const from = result.from === undefined ? "none" : `period ${result.from}`;
      report(`period created: user ${userId}, period ${id}, from ${from}`);
      return { kind: "saved", id };
    } catch (error) {
      return overlapOrThrow(error, userId, dates, undefined, report);
    }
  });
}

/** Saves a period's dates, refused when they overlap another's. */
export function updatePeriodDates(
  userId: string,
  id: string,
  dates: PeriodDates,
  report: Report = toStderr
): Promise<PeriodWrite> {
  if (!isRowId(id)) {
    return Promise.resolve({ kind: "missing" });
  }
  return logged("period updated", `user ${userId}, period ${id}`, report, async () => {
    try {
      const result = await getDatabase().transaction(async (tx) => {
        if ((await lockPeriod(tx, userId, id)) === null) {
          return { kind: "missing" } as const;
        }
        const periods = await periodsOf(tx, userId);
        const other = overlapping(periods, dates, id);
        if (other !== undefined) {
          return { kind: "overlap", with: other } as const;
        }
        await tx
          .update(period)
          .set({ ...dates, updatedAt: new Date() })
          .where(and(owned(userId), eq(period.id, id)));
        return { kind: "saved", id } as const;
      });
      if (result.kind === "overlap") {
        report(`period refused, overlap: user ${userId}`);
      } else if (result.kind === "saved") {
        report(`period updated: user ${userId}, period ${id}`);
      }
      return result;
    } catch (error) {
      return overlapOrThrow(error, userId, dates, id, report);
    }
  });
}

/** Deletes a period and its sessions; false when it was not the parent's or not there. */
export function deletePeriod(userId: string, id: string, report: Report = toStderr) {
  if (!isRowId(id)) {
    return Promise.resolve(false);
  }
  return logged("period deleted", `user ${userId}, period ${id}`, report, async () => {
    const removed = await getDatabase()
      .delete(period)
      .where(and(owned(userId), eq(period.id, id)))
      .returning({ id: period.id });
    if (removed.length > 0) {
      report(`period deleted: user ${userId}, period ${id}`);
    }
    return removed.length > 0;
  });
}

export type ChildWrite = { kind: "saved"; id: string } | { kind: "missing" } | { kind: "limit" };

/** Locks one of the parent's periods for a write to its sessions; null when it is not theirs. */
const lockPeriod = async (tx: Transaction, userId: string, id: string) => {
  const [found] = await tx
    .select({ id: period.id })
    .from(period)
    .where(and(owned(userId), eq(period.id, id)))
    .for("update");
  return found ?? null;
};

/** Locks one of the parent's sessions; null when it is not theirs. */
const lockSession = async (tx: Transaction, userId: string, id: string) => {
  const [found] = await tx
    .select({
      id: trainingSession.id,
      periodId: trainingSession.periodId,
      place: trainingSession.place,
    })
    .from(trainingSession)
    .innerJoin(period, eq(period.id, trainingSession.periodId))
    .where(and(owned(userId), eq(trainingSession.id, id)))
    .for("update", { of: trainingSession });
  return found ?? null;
};

/** Locks one of the parent's blocks, and only it; null when it is not theirs. */
const lockBlock = async (tx: Transaction, userId: string, id: string) => {
  const [found] = await tx
    .select({ id: block.id, sessionId: block.sessionId })
    .from(block)
    .innerJoin(trainingSession, eq(trainingSession.id, block.sessionId))
    .innerJoin(period, eq(period.id, trainingSession.periodId))
    .where(and(owned(userId), eq(block.id, id)))
    .for("update", { of: block });
  return found ?? null;
};

// A write that renumbers or swaps a row's siblings locks their parent before
// the row, as every write here locks from the period down; locking the row
// first would deadlock with a write to a sibling waiting for the parent.

/** A session's period, unlocked, so the period can be locked before the session. */
const periodOfSession = async (tx: Transaction, userId: string, id: string) => {
  const [found] = await tx
    .select({ periodId: trainingSession.periodId })
    .from(trainingSession)
    .innerJoin(period, eq(period.id, trainingSession.periodId))
    .where(and(owned(userId), eq(trainingSession.id, id)));
  return found?.periodId ?? null;
};

/** A block's session, unlocked, so the session can be locked before the block. */
const sessionOfBlock = async (tx: Transaction, userId: string, id: string) => {
  const [found] = await tx
    .select({ sessionId: block.sessionId })
    .from(block)
    .innerJoin(trainingSession, eq(trainingSession.id, block.sessionId))
    .innerJoin(period, eq(period.id, trainingSession.periodId))
    .where(and(owned(userId), eq(block.id, id)));
  return found?.sessionId ?? null;
};

/** A block exercise's block, unlocked, so the block can be locked before it. */
const blockOfBlockExercise = async (tx: Transaction, userId: string, id: string) => {
  const [found] = await tx
    .select({ blockId: blockExercise.blockId })
    .from(blockExercise)
    .innerJoin(block, eq(block.id, blockExercise.blockId))
    .innerJoin(trainingSession, eq(trainingSession.id, block.sessionId))
    .innerJoin(period, eq(period.id, trainingSession.periodId))
    .where(and(owned(userId), eq(blockExercise.id, id)));
  return found?.blockId ?? null;
};

const nextPosition = async (
  tx: Transaction,
  table: typeof trainingSession | typeof block | typeof blockExercise,
  parent: SQL
) => {
  const [row] = await tx.select({ count: sql<number>`count(*)::int` }).from(table).where(parent);
  return (row?.count ?? 0) + 1;
};

/** Adds a session at the end of a period, with a new session's settings. */
export function addSession(
  userId: string,
  periodId: string,
  report: Report = toStderr
): Promise<ChildWrite> {
  if (!isRowId(periodId)) {
    return Promise.resolve({ kind: "missing" });
  }
  return logged("session created", `user ${userId}, period ${periodId}`, report, async () => {
    const result = await getDatabase().transaction(async (tx): Promise<ChildWrite> => {
      if ((await lockPeriod(tx, userId, periodId)) === null) {
        return { kind: "missing" };
      }
      const position = await nextPosition(
        tx,
        trainingSession,
        eq(trainingSession.periodId, periodId)
      );
      if (position > SESSIONS_MAX) {
        return { kind: "limit" };
      }
      const id = randomUUID();
      await tx.insert(trainingSession).values({
        id,
        periodId,
        position,
        place: NEW_SESSION.place,
        targetMinutes: NEW_SESSION.targetMinutes,
      });
      await tx
        .insert(trainingSessionEquipment)
        .values(NEW_SESSION.equipment.map((label) => ({ sessionId: id, label })));
      return { kind: "saved", id };
    });
    if (result.kind === "saved") {
      report(`session created: user ${userId}, session ${result.id}`);
    }
    return result;
  });
}

/** One of the parent's sessions, with its period, equipment, and blocks with their exercises, in order. */
export function getSession(userId: string, id: string, report: Report = toStderr) {
  if (!isRowId(id)) {
    return Promise.resolve(null);
  }
  return logged("session read", `user ${userId}, session ${id}`, report, () =>
    snapshot(async (tx): Promise<SessionDetail | null> => {
      const [found] = await tx
        .select({
          id: trainingSession.id,
          position: trainingSession.position,
          place: trainingSession.place,
          targetMinutes: trainingSession.targetMinutes,
          period: { id: period.id, startsOn: period.startsOn, weeks: period.weeks },
          equipment: sql<
            string[]
          >`coalesce((select array_agg(${trainingSessionEquipment.label}) from ${trainingSessionEquipment} where ${trainingSessionEquipment.sessionId} = ${trainingSession.id}), '{}')`,
        })
        .from(trainingSession)
        .innerJoin(period, eq(period.id, trainingSession.periodId))
        .where(and(owned(userId), eq(trainingSession.id, id)));
      if (found === undefined) {
        return null;
      }
      const blocks = await tx
        .select({ id: block.id, position: block.position, theme: block.theme })
        .from(block)
        .where(eq(block.sessionId, id))
        .orderBy(asc(block.position));
      const exercises =
        blocks.length === 0
          ? []
          : await tx
              .select({
                id: blockExercise.id,
                blockId: blockExercise.blockId,
                position: blockExercise.position,
                exerciseId: blockExercise.exerciseId,
                name: exercise.name,
                amountKind: blockExercise.amountKind,
                amount: blockExercise.amount,
                durationMinutes: exercise.durationMinutes,
                labels: sql<
                  string[]
                >`coalesce((select array_agg(${exerciseLabel.label}) from ${exerciseLabel} where ${exerciseLabel.exerciseId} = ${exercise.id}), '{}')`,
              })
              .from(blockExercise)
              .innerJoin(exercise, eq(exercise.id, blockExercise.exerciseId))
              .where(
                inArray(
                  blockExercise.blockId,
                  blocks.map((each) => each.id)
                )
              )
              .orderBy(asc(blockExercise.position));
      return {
        id: found.id,
        position: found.position,
        place: found.place as LabelKey,
        targetMinutes: found.targetMinutes,
        equipment: inListOrder(found.equipment),
        period: found.period,
        blocks: blocks.map((each) => ({
          ...each,
          exercises: exercises
            .filter((row) => row.blockId === each.id)
            .map(({ blockId: _, ...row }) => ({
              ...row,
              amountKind: row.amountKind as AmountKind,
              labels: inListOrder(row.labels),
            })),
        })),
      };
    })
  );
}

/** Saves a session's place, equipment and target. */
export function updateSessionSettings(
  userId: string,
  id: string,
  settings: SessionSettings,
  report: Report = toStderr
): Promise<ChildWrite> {
  if (!isRowId(id)) {
    return Promise.resolve({ kind: "missing" });
  }
  return logged("session updated", `user ${userId}, session ${id}`, report, async () => {
    const result = await getDatabase().transaction(async (tx): Promise<ChildWrite> => {
      if ((await lockSession(tx, userId, id)) === null) {
        return { kind: "missing" };
      }
      await tx
        .update(trainingSession)
        .set({
          place: settings.place,
          targetMinutes: settings.targetMinutes,
          updatedAt: new Date(),
        })
        .where(eq(trainingSession.id, id));
      await tx.delete(trainingSessionEquipment).where(eq(trainingSessionEquipment.sessionId, id));
      if (settings.equipment.length > 0) {
        await tx
          .insert(trainingSessionEquipment)
          .values(settings.equipment.map((label) => ({ sessionId: id, label })));
      }
      return { kind: "saved", id };
    });
    if (result.kind === "saved") {
      report(`session updated: user ${userId}, session ${id}`);
    }
    return result;
  });
}

/** Deletes a session and renumbers those after it; the period's id, or null when it was not there. */
export function deleteSession(userId: string, id: string, report: Report = toStderr) {
  if (!isRowId(id)) {
    return Promise.resolve(null);
  }
  return logged("session deleted", `user ${userId}, session ${id}`, report, async () => {
    const periodId = await getDatabase().transaction(async (tx) => {
      const parent = await periodOfSession(tx, userId, id);
      if (parent === null || (await lockPeriod(tx, userId, parent)) === null) {
        return null;
      }
      const found = await lockSession(tx, userId, id);
      if (found === null) {
        return null;
      }
      const [removed] = await tx
        .delete(trainingSession)
        .where(eq(trainingSession.id, id))
        .returning({ position: trainingSession.position });
      await tx
        .update(trainingSession)
        .set({ position: sql`${trainingSession.position} - 1` })
        .where(
          and(
            eq(trainingSession.periodId, found.periodId),
            gt(trainingSession.position, (removed as { position: number }).position)
          )
        );
      return found.periodId;
    });
    if (periodId !== null) {
      report(`session deleted: user ${userId}, session ${id}`);
    }
    return periodId;
  });
}

/** Adds a block at the end of a session. */
export function addBlock(
  userId: string,
  sessionId: string,
  theme: string,
  report: Report = toStderr
): Promise<ChildWrite> {
  if (!isRowId(sessionId)) {
    return Promise.resolve({ kind: "missing" });
  }
  return logged("block created", `user ${userId}, session ${sessionId}`, report, async () => {
    const result = await getDatabase().transaction(async (tx): Promise<ChildWrite> => {
      if ((await lockSession(tx, userId, sessionId)) === null) {
        return { kind: "missing" };
      }
      const position = await nextPosition(tx, block, eq(block.sessionId, sessionId));
      if (position > BLOCKS_MAX) {
        return { kind: "limit" };
      }
      const id = randomUUID();
      await tx.insert(block).values({ id, sessionId, position, theme });
      return { kind: "saved", id };
    });
    if (result.kind === "saved") {
      report(`block created: user ${userId}, block ${result.id}`);
    }
    return result;
  });
}

/** Renames a block; the session's id, or null when it was not the parent's. */
export function updateBlockTheme(
  userId: string,
  id: string,
  theme: string,
  report: Report = toStderr
) {
  if (!isRowId(id)) {
    return Promise.resolve(null);
  }
  return logged("block updated", `user ${userId}, block ${id}`, report, async () => {
    const sessionId = await getDatabase().transaction(async (tx) => {
      const found = await lockBlock(tx, userId, id);
      if (found === null) {
        return null;
      }
      await tx.update(block).set({ theme, updatedAt: new Date() }).where(eq(block.id, id));
      return found.sessionId;
    });
    if (sessionId !== null) {
      report(`block updated: user ${userId}, block ${id}`);
    }
    return sessionId;
  });
}

/**
 * Swaps a row with its neighbour in `direction`, both under their parent;
 * the positions' unique constraint is checked at commit, so the swap holds.
 */
async function swap(
  tx: Transaction,
  table: typeof block | typeof blockExercise,
  parent: SQL,
  id: string,
  direction: Direction
) {
  const rows = await tx
    .select({ id: table.id, position: table.position })
    .from(table)
    .where(parent)
    .orderBy(asc(table.position));
  const index = rows.findIndex((row) => row.id === id);
  const other = rows[direction === "up" ? index - 1 : index + 1];
  const self = rows[index] as { id: string; position: number };
  if (other === undefined) {
    return false;
  }
  await tx.update(table).set({ position: other.position }).where(eq(table.id, self.id));
  await tx.update(table).set({ position: self.position }).where(eq(table.id, other.id));
  return true;
}

/** Moves a block up or down in its session; the session's id, or null when it was not the parent's. */
export function moveBlock(
  userId: string,
  id: string,
  direction: Direction,
  report: Report = toStderr
) {
  if (!isRowId(id)) {
    return Promise.resolve(null);
  }
  return logged("block moved", `user ${userId}, block ${id}`, report, async () => {
    const result = await getDatabase().transaction(async (tx) => {
      const parent = await sessionOfBlock(tx, userId, id);
      if (parent === null || (await lockSession(tx, userId, parent)) === null) {
        return null;
      }
      const found = await lockBlock(tx, userId, id);
      if (found === null) {
        return null;
      }
      const moved = await swap(tx, block, eq(block.sessionId, found.sessionId), id, direction);
      return { sessionId: found.sessionId, moved };
    });
    if (result?.moved) {
      report(`block moved: user ${userId}, block ${id}`);
    }
    return result?.sessionId ?? null;
  });
}

/** Deletes a block and renumbers those after it; the session's id, or null when it was not there. */
export function deleteBlock(userId: string, id: string, report: Report = toStderr) {
  if (!isRowId(id)) {
    return Promise.resolve(null);
  }
  return logged("block deleted", `user ${userId}, block ${id}`, report, async () => {
    const sessionId = await getDatabase().transaction(async (tx) => {
      const parent = await sessionOfBlock(tx, userId, id);
      if (parent === null || (await lockSession(tx, userId, parent)) === null) {
        return null;
      }
      const found = await lockBlock(tx, userId, id);
      if (found === null) {
        return null;
      }
      const [removed] = await tx
        .delete(block)
        .where(eq(block.id, id))
        .returning({ position: block.position });
      await tx
        .update(block)
        .set({ position: sql`${block.position} - 1` })
        .where(
          and(
            eq(block.sessionId, found.sessionId),
            gt(block.position, (removed as { position: number }).position)
          )
        );
      return found.sessionId;
    });
    if (sessionId !== null) {
      report(`block deleted: user ${userId}, block ${id}`);
    }
    return sessionId;
  });
}

export type BlockExerciseWrite =
  | { kind: "saved"; sessionId: string }
  | { kind: "missing" }
  | { kind: "limit" };

/** Adds one of the parent's library exercises at the end of a block, with the library's kind and amount. */
export function addBlockExercise(
  userId: string,
  blockId: string,
  exerciseId: string,
  report: Report = toStderr
): Promise<BlockExerciseWrite> {
  if (!isRowId(blockId) || !isRowId(exerciseId)) {
    return Promise.resolve({ kind: "missing" });
  }
  return logged("block exercise created", `user ${userId}, block ${blockId}`, report, async () => {
    const result = await getDatabase().transaction(async (tx) => {
      const found = await lockBlock(tx, userId, blockId);
      // Held until the insert commits, so a deletion of the exercise waits and then finds it in use.
      const [library] = await tx
        .select({ amountKind: exercise.amountKind, amount: exercise.amount })
        .from(exercise)
        .where(and(eq(exercise.userId, userId), eq(exercise.id, exerciseId)))
        .for("key share");
      if (found === null || library === undefined) {
        return { kind: "missing" } as const;
      }
      const position = await nextPosition(tx, blockExercise, eq(blockExercise.blockId, blockId));
      if (position > BLOCK_EXERCISES_MAX) {
        return { kind: "limit" } as const;
      }
      const id = randomUUID();
      await tx.insert(blockExercise).values({ id, blockId, exerciseId, position, ...library });
      return { kind: "saved", sessionId: found.sessionId, id } as const;
    });
    if (result.kind === "saved") {
      report(`block exercise created: user ${userId}, block exercise ${result.id}`);
      return { kind: "saved", sessionId: result.sessionId };
    }
    return result;
  });
}

/** Locks one of the parent's block exercises, and only it; null when it is not theirs. */
const lockBlockExercise = async (tx: Transaction, userId: string, id: string) => {
  const [found] = await tx
    .select({
      id: blockExercise.id,
      blockId: blockExercise.blockId,
      sessionId: block.sessionId,
      amountKind: blockExercise.amountKind,
    })
    .from(blockExercise)
    .innerJoin(block, eq(block.id, blockExercise.blockId))
    .innerJoin(trainingSession, eq(trainingSession.id, block.sessionId))
    .innerJoin(period, eq(period.id, trainingSession.periodId))
    .where(and(owned(userId), eq(blockExercise.id, id)))
    .for("update", { of: blockExercise });
  return found ?? null;
};

/** A block exercise's kind, which its amount's rule depends on, or null when it is not the parent's. */
export function blockExerciseKind(userId: string, id: string, report: Report = toStderr) {
  if (!isRowId(id)) {
    return Promise.resolve(null);
  }
  return logged("block exercise read", `user ${userId}, block exercise ${id}`, report, async () => {
    const [found] = await getDatabase()
      .select({ amountKind: blockExercise.amountKind })
      .from(blockExercise)
      .innerJoin(block, eq(block.id, blockExercise.blockId))
      .innerJoin(trainingSession, eq(trainingSession.id, block.sessionId))
      .innerJoin(period, eq(period.id, trainingSession.periodId))
      .where(and(owned(userId), eq(blockExercise.id, id)));
    return found === undefined ? null : (found.amountKind as AmountKind);
  });
}

/** Saves a block exercise's amount, its kind kept; the session's id, or null when it was not there. */
export function updateBlockExerciseAmount(
  userId: string,
  id: string,
  amount: number,
  report: Report = toStderr
) {
  if (!isRowId(id)) {
    return Promise.resolve(null);
  }
  return logged(
    "block exercise updated",
    `user ${userId}, block exercise ${id}`,
    report,
    async () => {
      const sessionId = await getDatabase().transaction(async (tx) => {
        const found = await lockBlockExercise(tx, userId, id);
        if (found === null) {
          return null;
        }
        await tx
          .update(blockExercise)
          .set({ amount, updatedAt: new Date() })
          .where(eq(blockExercise.id, id));
        return found.sessionId;
      });
      if (sessionId !== null) {
        report(`block exercise updated: user ${userId}, block exercise ${id}`);
      }
      return sessionId;
    }
  );
}

/** Moves a block exercise up or down in its block; the session's id, or null when it was not there. */
export function moveBlockExercise(
  userId: string,
  id: string,
  direction: Direction,
  report: Report = toStderr
) {
  if (!isRowId(id)) {
    return Promise.resolve(null);
  }
  return logged(
    "block exercise moved",
    `user ${userId}, block exercise ${id}`,
    report,
    async () => {
      const result = await getDatabase().transaction(async (tx) => {
        const parent = await blockOfBlockExercise(tx, userId, id);
        if (parent === null || (await lockBlock(tx, userId, parent)) === null) {
          return null;
        }
        const found = await lockBlockExercise(tx, userId, id);
        if (found === null) {
          return null;
        }
        const moved = await swap(
          tx,
          blockExercise,
          eq(blockExercise.blockId, found.blockId),
          id,
          direction
        );
        return { sessionId: found.sessionId, moved };
      });
      if (result?.moved) {
        report(`block exercise moved: user ${userId}, block exercise ${id}`);
      }
      return result?.sessionId ?? null;
    }
  );
}

/** Takes an exercise out of its block, renumbering those after it; the session's id, or null. */
export function deleteBlockExercise(userId: string, id: string, report: Report = toStderr) {
  if (!isRowId(id)) {
    return Promise.resolve(null);
  }
  return logged(
    "block exercise deleted",
    `user ${userId}, block exercise ${id}`,
    report,
    async () => {
      const sessionId = await getDatabase().transaction(async (tx) => {
        const parent = await blockOfBlockExercise(tx, userId, id);
        if (parent === null || (await lockBlock(tx, userId, parent)) === null) {
          return null;
        }
        const found = await lockBlockExercise(tx, userId, id);
        if (found === null) {
          return null;
        }
        const [removed] = await tx
          .delete(blockExercise)
          .where(eq(blockExercise.id, id))
          .returning({ position: blockExercise.position });
        await tx
          .update(blockExercise)
          .set({ position: sql`${blockExercise.position} - 1` })
          .where(
            and(
              eq(blockExercise.blockId, found.blockId),
              gt(blockExercise.position, (removed as { position: number }).position)
            )
          );
        return found.sessionId;
      });
      if (sessionId !== null) {
        report(`block exercise deleted: user ${userId}, block exercise ${id}`);
      }
      return sessionId;
    }
  );
}

/** The parent's periods that use a library exercise, earliest first. */
export const periodsUsing = (
  db: Pick<Database, "selectDistinct">,
  userId: string,
  exerciseId: string
) =>
  db
    .selectDistinct({ id: period.id, startsOn: period.startsOn, weeks: period.weeks })
    .from(blockExercise)
    .innerJoin(block, eq(block.id, blockExercise.blockId))
    .innerJoin(trainingSession, eq(trainingSession.id, block.sessionId))
    .innerJoin(period, eq(period.id, trainingSession.periodId))
    .where(and(owned(userId), eq(blockExercise.exerciseId, exerciseId)))
    .orderBy(asc(period.startsOn));

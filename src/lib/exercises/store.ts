/**
 * The library's reads and writes, always within one parent's own exercises.
 * Each write leaves one line in the log, with ids only, and a name already in
 * use is decided by the database's unique index, so two saves at once cannot
 * both pass.
 *
 * decisions/f002-exercise-library.md
 */

import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { toStderr } from "@/lib/auth/allowlist";
import { getDatabase } from "@/lib/db/index";
import { logged, type Report } from "@/lib/db/logged";
import { exercise, exerciseLabel } from "@/lib/db/schema";
import type { LabelKey } from "./labels";
import type { AmountKind, Exercise, Level } from "./rules";

export type StoredExercise = Exercise & { id: string };

export type SaveResult =
  | { kind: "saved"; id: string }
  | { kind: "nameInUse" }
  | { kind: "missing" };

const NAME_INDEX = "exercise_user_name_idx";

/** Whether a failure is the unique index refusing a name already in the library. */
function isNameInUse(error: unknown): boolean {
  const cause = error instanceof Error ? error.cause : undefined;
  return (
    typeof cause === "object" &&
    cause !== null &&
    (cause as { code?: unknown }).code === "23505" &&
    (cause as { constraint_name?: unknown }).constraint_name === NAME_INDEX
  );
}

type Row = typeof exercise.$inferSelect;

const toExercise = (row: Row, labels: LabelKey[]): StoredExercise => ({
  id: row.id,
  name: row.name,
  instructions: row.instructions,
  videoUrl: row.videoUrl,
  amountKind: row.amountKind as AmountKind,
  amount: row.amount,
  durationMinutes: row.durationMinutes,
  level: row.level as Level,
  warmUp: row.warmUp,
  labels,
});

const columnsOf = (values: Exercise) => ({
  name: values.name,
  instructions: values.instructions,
  videoUrl: values.videoUrl,
  amountKind: values.amountKind,
  amount: values.amount,
  durationMinutes: values.durationMinutes,
  level: values.level,
  warmUp: values.warmUp,
});

type Reader = Pick<ReturnType<typeof getDatabase>, "select">;

/** The rows' labels, read by `reader`, so in the same snapshot as the rows. */
async function withLabels(reader: Reader, rows: Row[]): Promise<StoredExercise[]> {
  if (rows.length === 0) {
    return [];
  }
  const labels = await reader
    .select()
    .from(exerciseLabel)
    .where(
      inArray(
        exerciseLabel.exerciseId,
        rows.map((row) => row.id)
      )
    );
  return rows.map((row) =>
    toExercise(
      row,
      labels.filter((label) => label.exerciseId === row.id).map((label) => label.label as LabelKey)
    )
  );
}

// Rows and labels in one snapshot, so a save between the two reads cannot mix versions.
const SNAPSHOT = { isolationLevel: "repeatable read", accessMode: "read only" } as const;

/** The parent's whole library, in no particular order. */
export function listExercises(userId: string, report: Report = toStderr) {
  return logged("exercise list", `user ${userId}`, report, () =>
    getDatabase().transaction(
      async (tx) =>
        withLabels(tx, await tx.select().from(exercise).where(eq(exercise.userId, userId))),
      SNAPSHOT
    )
  );
}

/** One of the parent's exercises, or null when it is not theirs or not there. */
export function getExercise(userId: string, id: string, report: Report = toStderr) {
  return logged("exercise read", `user ${userId}, exercise ${id}`, report, () =>
    getDatabase().transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(exercise)
        .where(and(eq(exercise.userId, userId), eq(exercise.id, id)));
      const [found] = await withLabels(tx, rows);
      return found ?? null;
    }, SNAPSHOT)
  );
}

/** Adds an exercise, with its labels, or says its name is already in use. */
export function createExercise(
  userId: string,
  values: Exercise,
  report: Report = toStderr
): Promise<SaveResult> {
  return logged("exercise created", `user ${userId}`, report, async () => {
    const id = randomUUID();
    try {
      await getDatabase().transaction(async (tx) => {
        await tx.insert(exercise).values({ id, userId, ...columnsOf(values) });
        await tx
          .insert(exerciseLabel)
          .values(values.labels.map((label) => ({ exerciseId: id, label })));
      });
    } catch (error) {
      if (isNameInUse(error)) {
        report(`exercise refused, name in use: user ${userId}`);
        return { kind: "nameInUse" };
      }
      throw error;
    }
    report(`exercise created: user ${userId}, exercise ${id}`);
    return { kind: "saved", id };
  });
}

/** Saves an exercise and replaces its labels, or says why not. */
export function updateExercise(
  userId: string,
  id: string,
  values: Exercise,
  report: Report = toStderr
): Promise<SaveResult> {
  return logged("exercise updated", `user ${userId}, exercise ${id}`, report, async () => {
    let found = false;
    try {
      found = await getDatabase().transaction(async (tx) => {
        const [updated] = await tx
          .update(exercise)
          .set({ ...columnsOf(values), updatedAt: new Date() })
          .where(and(eq(exercise.userId, userId), eq(exercise.id, id)))
          .returning({ id: exercise.id });
        if (!updated) {
          return false;
        }
        await tx.delete(exerciseLabel).where(eq(exerciseLabel.exerciseId, id));
        await tx
          .insert(exerciseLabel)
          .values(values.labels.map((label) => ({ exerciseId: id, label })));
        return true;
      });
    } catch (error) {
      if (isNameInUse(error)) {
        report(`exercise refused, name in use: user ${userId}`);
        return { kind: "nameInUse" };
      }
      throw error;
    }
    if (!found) {
      return { kind: "missing" };
    }
    report(`exercise updated: user ${userId}, exercise ${id}`);
    return { kind: "saved", id };
  });
}

/** Deletes one of the parent's exercises; false when it was not theirs or not there. */
export function deleteExercise(userId: string, id: string, report: Report = toStderr) {
  return logged("exercise deleted", `user ${userId}, exercise ${id}`, report, async () => {
    const removed = await getDatabase()
      .delete(exercise)
      .where(and(eq(exercise.userId, userId), eq(exercise.id, id)))
      .returning({ id: exercise.id });
    if (removed.length > 0) {
      report(`exercise deleted: user ${userId}, exercise ${id}`);
    }
    return removed.length > 0;
  });
}

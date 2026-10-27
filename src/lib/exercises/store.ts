/**
 * The library's reads and writes, always within one parent's own exercises.
 * Each write logs ids only; the unique index decides a name already in use, so
 * two saves at once cannot both pass.
 *
 * decisions/f002-exercise-library.md
 * decisions/f003-exercise-import.md
 */

import { randomUUID } from "node:crypto";
import { and, eq, type SQL, sql } from "drizzle-orm";
import { toStderr } from "@/lib/auth/allowlist";
import { type Database, getDatabase } from "@/lib/db/index";
import { logged, type Report } from "@/lib/db/logged";
import { exercise, exerciseLabel } from "@/lib/db/schema";
import { LABEL_KEYS, type LabelKey } from "./labels";
import type { AmountKind, CheckedExercise, Exercise, Level } from "./rules";

export type StoredExercise = Exercise & { id: string };

export type SaveResult =
  | { kind: "saved"; id: string }
  | { kind: "nameInUse" }
  | { kind: "missing" };

const NAME_INDEX = "exercise_user_name_idx";

/**
 * Whether a failure is a name already in the library: the unique index
 * refusing it, or a deadlock with another write claiming the same names,
 * which these writes can meet only on that index. Postgres aborts one of the
 * two, and the other commits the name, so for the one aborted it is in use.
 */
function isNameInUse(error: unknown): boolean {
  const cause = error instanceof Error ? error.cause : undefined;
  if (typeof cause !== "object" || cause === null) {
    return false;
  }
  const { code, constraint_name } = cause as { code?: unknown; constraint_name?: unknown };
  return (code === "23505" && constraint_name === NAME_INDEX) || code === "40P01";
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

/**
 * Whether `id` is one this store could have made. Anything else, such as a
 * crafted address holding U+0000, which Postgres cannot even compare, is no
 * exercise of anyone's.
 */
const isExerciseId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);

/** Labels in the list's order, as readExercise gives them: Postgres promises no order. */
const inListOrder = (labels: readonly string[]): LabelKey[] =>
  LABEL_KEYS.filter((key) => labels.includes(key));

/** Exercises with their labels, in one statement, so a save cannot land between them. */
async function readExercises(where: SQL | undefined): Promise<StoredExercise[]> {
  const rows = await getDatabase()
    .select({
      row: exercise,
      labels: sql<
        string[]
      >`coalesce(array_agg(${exerciseLabel.label}) filter (where ${exerciseLabel.label} is not null), '{}')`,
    })
    .from(exercise)
    .leftJoin(exerciseLabel, eq(exerciseLabel.exerciseId, exercise.id))
    .where(where)
    .groupBy(exercise.id);
  return rows.map(({ row, labels }) => toExercise(row, inListOrder(labels)));
}

/** The parent's whole library, in no particular order. */
export function listExercises(userId: string, report: Report = toStderr) {
  return logged("exercise list", `user ${userId}`, report, () =>
    readExercises(eq(exercise.userId, userId))
  );
}

/** One of the parent's exercises, or null when it is not theirs or not there. */
export function getExercise(userId: string, id: string, report: Report = toStderr) {
  if (!isExerciseId(id)) {
    return Promise.resolve(null);
  }
  return logged("exercise read", `user ${userId}, exercise ${id}`, report, async () => {
    const [found] = await readExercises(and(eq(exercise.userId, userId), eq(exercise.id, id)));
    return found ?? null;
  });
}

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

const insertLabels = (tx: Transaction, id: string, labels: readonly LabelKey[]) =>
  tx.insert(exerciseLabel).values(labels.map((label) => ({ exerciseId: id, label })));

/** Adds one exercise and its labels within `tx`, under a new id. */
async function insertExercise(tx: Transaction, userId: string, values: CheckedExercise) {
  const id = randomUUID();
  await tx.insert(exercise).values({ id, userId, ...columnsOf(values) });
  await insertLabels(tx, id, values.labels);
  return id;
}

/**
 * Runs a write, turning the name index's refusal into `nameInUse`, logged as
 * `event`; any other failure passes on.
 */
async function refusingNameInUse<T>(
  event: string,
  userId: string,
  report: Report,
  write: () => Promise<T>
): Promise<T | { kind: "nameInUse" }> {
  try {
    return await write();
  } catch (error) {
    if (isNameInUse(error)) {
      report(`${event}: user ${userId}`);
      return { kind: "nameInUse" };
    }
    throw error;
  }
}

/**
 * Adds an exercise, with its labels, or says its name is already in use. An
 * add sent again, after its answer was lost, is refused the same way, since
 * the first is already in the library.
 */
export function createExercise(
  userId: string,
  values: CheckedExercise,
  report: Report = toStderr
): Promise<SaveResult> {
  return logged("exercise created", `user ${userId}`, report, async () => {
    const result = await refusingNameInUse("exercise refused, name in use", userId, report, () =>
      getDatabase().transaction(
        async (tx) => ({ kind: "saved", id: await insertExercise(tx, userId, values) }) as const
      )
    );
    if (result.kind === "saved") {
      report(`exercise created: user ${userId}, exercise ${result.id}`);
    }
    return result;
  });
}

/** Saves an exercise and replaces its labels, or says why not. */
export function updateExercise(
  userId: string,
  id: string,
  values: CheckedExercise,
  report: Report = toStderr
): Promise<SaveResult> {
  if (!isExerciseId(id)) {
    return Promise.resolve({ kind: "missing" });
  }
  return logged("exercise updated", `user ${userId}, exercise ${id}`, report, async () => {
    const result = await refusingNameInUse("exercise refused, name in use", userId, report, () =>
      getDatabase().transaction(async (tx) => {
        const [updated] = await tx
          .update(exercise)
          .set({ ...columnsOf(values), updatedAt: new Date() })
          .where(and(eq(exercise.userId, userId), eq(exercise.id, id)))
          .returning({ id: exercise.id });
        if (!updated) {
          return { kind: "missing" } as const;
        }
        await tx.delete(exerciseLabel).where(eq(exerciseLabel.exerciseId, id));
        await insertLabels(tx, id, values.labels);
        return { kind: "saved", id } as const;
      })
    );
    if (result.kind === "saved") {
      report(`exercise updated: user ${userId}, exercise ${id}`);
    }
    return result;
  });
}

/**
 * Adds an import's exercises and labels within `tx`, in two statements, rows
 * in one order by name, so two imports at once sharing names wait on each
 * other; a deadlock with a rename is refused as the name in use.
 */
async function insertImport(
  tx: Transaction,
  userId: string,
  exercises: readonly CheckedExercise[]
) {
  const added = [...exercises]
    // The names as written break a tie, so distinct names never keep their input order.
    .sort(
      (a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()) ||
        (a.name < b.name ? -1 : Number(a.name > b.name))
    )
    .map((values) => ({ id: randomUUID(), values }));
  await tx
    .insert(exercise)
    .values(added.map(({ id, values }) => ({ id, userId, ...columnsOf(values) })));
  const labels = added.flatMap(({ id, values }) =>
    values.labels.map((label) => ({ exerciseId: id, label }))
  );
  await tx.insert(exerciseLabel).values(labels);
}

export type ImportResult = { kind: "imported"; count: number } | { kind: "nameInUse" };

/**
 * Adds every exercise of an import in one transaction, or none: a name the
 * library took meanwhile refuses the whole import.
 */
export function importExercises(
  userId: string,
  exercises: readonly CheckedExercise[],
  report: Report = toStderr
): Promise<ImportResult> {
  return logged("exercises imported", `user ${userId}`, report, async () => {
    const result = await refusingNameInUse(
      "exercise import refused, name in use",
      userId,
      report,
      () =>
        getDatabase().transaction(async (tx) => {
          await insertImport(tx, userId, exercises);
          return { kind: "imported", count: exercises.length } as const;
        })
    );
    if (result.kind === "imported") {
      report(`exercises imported: user ${userId}, ${result.count} exercises`);
    }
    return result;
  });
}

/** Deletes one of the parent's exercises; false when it was not theirs or not there. */
export function deleteExercise(userId: string, id: string, report: Report = toStderr) {
  if (!isExerciseId(id)) {
    return Promise.resolve(false);
  }
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

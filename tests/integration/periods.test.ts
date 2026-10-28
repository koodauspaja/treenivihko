/**
 * The periods' store against Postgres: its checks, its locks and its races.
 *
 * decisions/f002-exercise-library.md
 * decisions/f004-periods-and-sessions.md
 */

import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase, openMigrationDatabase } from "@/lib/db/index";
import {
  journalTagsIn,
  MIGRATION_JOURNAL,
  MIGRATIONS_FOLDER,
  migrationLock,
  runMigrations,
  sqlFilesIn,
} from "@/lib/db/migrations";
import {
  block,
  blockExercise,
  exercise,
  period,
  trainingSession,
  trainingSessionEquipment,
  user,
} from "@/lib/db/schema";
import { type Exercise, readExercise, valuesFrom } from "@/lib/exercises/rules";
import { createExercise, deleteExercise, updateExercise } from "@/lib/exercises/store";
import { NEW_SESSION } from "@/lib/periods/rules";
import {
  addBlock,
  addBlockExercise,
  addSession,
  blockExerciseKind,
  createPeriod,
  deleteBlock,
  deleteBlockExercise,
  deletePeriod,
  deleteSession,
  getPeriod,
  getSession,
  listPeriodDates,
  listPeriods,
  moveBlock,
  moveBlockExercise,
  updateBlockExerciseAmount,
  updateBlockTheme,
  updatePeriodDates,
  updateSessionSettings,
} from "@/lib/periods/store";
import { deleteUsers } from "../support/users.ts";

let lines: string[] = [];
const report = (line: string) => {
  lines.push(line);
};

const database = () => getDatabase();

const LADDER: Exercise = {
  name: "Tikkaat: perusaskel",
  instructions: "Kaksi askelta sisään, yksi ulos.",
  videoUrl: null,
  amountKind: "count",
  amount: 10,
  durationMinutes: 5,
  level: 1,
  warmUp: true,
  labels: ["footwork", "field", "ladder"],
};

const SPRINT: Exercise = {
  ...LADDER,
  name: "Lähdöt",
  amountKind: "time",
  amount: 30,
  durationMinutes: 4,
  labels: ["speed", "field"],
};

/** A library exercise saved through readExercise, as every write is. */
const exerciseOf = async (userId: string, values: Exercise) => {
  const reading = readExercise(valuesFrom(values));
  if (!reading.ok) {
    throw new Error(`the fixture breaks a rule: ${JSON.stringify(reading.errors)}`);
  }
  const result = await createExercise(userId, reading.exercise, report);
  if (result.kind !== "saved") {
    throw new Error(`expected a save, got ${result.kind}`);
  }
  return result.id;
};

const periodOf = async (userId: string, startsOn: string, weeks = 2) => {
  const result = await createPeriod(userId, { startsOn, weeks }, report);
  if (result.kind !== "saved") {
    throw new Error(`expected a save, got ${result.kind}`);
  }
  return result.id;
};

const sessionOf = async (userId: string, periodId: string) => {
  const result = await addSession(userId, periodId, report);
  if (result.kind !== "saved") {
    throw new Error(`expected a save, got ${result.kind}`);
  }
  return result.id;
};

const blockOf = async (userId: string, sessionId: string, theme: string) => {
  const result = await addBlock(userId, sessionId, theme, report);
  if (result.kind !== "saved") {
    throw new Error(`expected a save, got ${result.kind}`);
  }
  return result.id;
};

const added = async (userId: string, blockId: string, exerciseId: string) => {
  const result = await addBlockExercise(userId, blockId, exerciseId, report);
  if (result.kind !== "saved") {
    throw new Error(`expected a save, got ${result.kind}`);
  }
};

type Transaction = Parameters<Parameters<ReturnType<typeof database>["transaction"]>[0]>[0];

const waitingOnLock = async () => {
  const [row] = await database().execute<{ waiting: number }>(
    sql`select count(*)::int as waiting from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock'`
  );
  return (row?.waiting ?? 0) > 0;
};

/**
 * What `act` comes to when `write` is in a transaction left open until `act`
 * waits on its locks, and committed then: two writes at once, in that order.
 */
const whileHeld = async <T>(
  write: (tx: Transaction) => Promise<unknown>,
  act: () => Promise<T>
) => {
  let written = () => {};
  let release = () => {};
  const done = new Promise<void>((resolve) => {
    written = resolve;
  });
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const held = database().transaction(async (tx) => {
    await write(tx);
    written();
    await released;
  });
  await done;
  const acting = act();
  while (!(await waitingOnLock())) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  release();
  await held;
  return acting;
};

/** A period with one session of two blocks, the first with both exercises. */
const builtPeriod = async (userId: string, startsOn: string) => {
  const ladder = await exerciseOf(userId, LADDER);
  const sprint = await exerciseOf(userId, SPRINT);
  const periodId = await periodOf(userId, startsOn);
  const sessionId = await sessionOf(userId, periodId);
  const warmUp = await blockOf(userId, sessionId, "Lämmittely");
  await blockOf(userId, sessionId, "Kuljetus");
  await added(userId, warmUp, ladder);
  await added(userId, warmUp, sprint);
  return { ladder, sprint, periodId, sessionId, warmUp };
};

beforeAll(async () => {
  const migration = openMigrationDatabase();
  try {
    await runMigrations({
      exists: existsSync,
      sqlFiles: () => sqlFilesIn(readdirSync(MIGRATIONS_FOLDER)),
      journalTags: () => journalTagsIn(readFileSync(MIGRATION_JOURNAL, "utf8")),
      migrate: (folder) => migrate(migration.database, { migrationsFolder: folder }),
      ...migrationLock(migration.database),
    });
  } finally {
    await migration.close();
  }
});

beforeEach(async () => {
  await deleteUsers();
  lines = [];
  for (const id of ["u1", "u2"]) {
    await database()
      .insert(user)
      .values({ id, name: "Test Parent", email: `${id}@example.com` });
  }
});

afterAll(async () => {
  await deleteUsers();
  await closeDatabase();
});

describe("a period", () => {
  it("is created empty when it is the first, and logged with ids only", async () => {
    const id = await periodOf("u1", "2026-11-02");
    expect(await getPeriod("u1", id, report)).toEqual({
      id,
      startsOn: "2026-11-02",
      weeks: 2,
      sessions: [],
    });
    expect(lines).toEqual([`period created: user u1, period ${id}, from none`]);
  });

  it("is created as a full copy of the one that ends last, in order", async () => {
    const first = await builtPeriod("u1", "2026-11-02");
    await updateSessionSettings(
      "u1",
      first.sessionId,
      { place: "gym", equipment: ["cones"], targetMinutes: 30 },
      report
    );
    const before = await getSession("u1", first.sessionId, report);
    lines = [];
    const second = await periodOf("u1", "2026-11-16");
    expect(lines).toEqual([
      `period created: user u1, period ${second}, from period ${first.periodId}`,
    ]);
    const copied = await getPeriod("u1", second, report);
    expect(copied?.sessions).toHaveLength(1);
    const session = await getSession("u1", copied?.sessions[0]?.id ?? "", report);
    const shape = (detail: typeof before) => ({
      position: detail?.position,
      place: detail?.place,
      equipment: detail?.equipment,
      targetMinutes: detail?.targetMinutes,
      blocks: detail?.blocks.map((each) => ({
        position: each.position,
        theme: each.theme,
        exercises: each.exercises.map(({ id: _, ...rest }) => rest),
      })),
    });
    expect(shape(session)).toEqual(shape(before));
    expect(session?.id).not.toBe(first.sessionId);
  });

  it("copies the latest by its end, not by when it was made", async () => {
    const later = await periodOf("u1", "2026-12-01", 1);
    await sessionOf("u1", later);
    await periodOf("u1", "2026-11-02", 1);
    const third = await periodOf("u1", "2026-12-08", 1);
    expect((await getPeriod("u1", third, report))?.sessions).toHaveLength(1);
  });

  it("is refused when its days overlap another's, naming it", async () => {
    const first = await periodOf("u1", "2026-11-02");
    lines = [];
    expect(await createPeriod("u1", { startsOn: "2026-11-15", weeks: 1 }, report)).toEqual({
      kind: "overlap",
      with: { id: first, startsOn: "2026-11-02", weeks: 2 },
    });
    expect(lines).toEqual(["period refused, overlap: user u1"]);
    // The day after its last is free; another parent's days are their own.
    expect((await createPeriod("u1", { startsOn: "2026-11-16", weeks: 1 }, report)).kind).toBe(
      "saved"
    );
    expect((await createPeriod("u2", { startsOn: "2026-11-02", weeks: 2 }, report)).kind).toBe(
      "saved"
    );
  });

  it("decides between two saves of overlapping days at once in the database", async () => {
    const results = await Promise.all([
      createPeriod("u1", { startsOn: "2026-11-02", weeks: 2 }, report),
      createPeriod("u1", { startsOn: "2026-11-09", weeks: 2 }, report),
    ]);
    expect(results.map((result) => result.kind).sort()).toEqual(["overlap", "saved"]);
    expect(await listPeriodDates("u1", report)).toHaveLength(1);
  });

  it("saves its dates, refused onto another's and for another parent", async () => {
    const first = await periodOf("u1", "2026-11-02");
    const second = await periodOf("u1", "2026-11-16");
    expect(
      await updatePeriodDates("u1", second, { startsOn: "2026-11-30", weeks: 3 }, report)
    ).toEqual({ kind: "saved", id: second });
    expect(
      (await updatePeriodDates("u1", second, { startsOn: "2026-11-10", weeks: 1 }, report)).kind
    ).toBe("overlap");
    expect(
      await updatePeriodDates("u1", first, { startsOn: "2026-11-02", weeks: 4 }, report)
    ).toEqual({
      kind: "saved",
      id: first,
    });
    expect(
      await updatePeriodDates("u2", first, { startsOn: "2026-10-01", weeks: 1 }, report)
    ).toEqual({
      kind: "missing",
    });
  });

  it("is not saved when it is deleted while its dates are being saved", async () => {
    const periodId = await periodOf("u1", "2026-11-02");
    const result = await whileHeld(
      (tx) => tx.delete(period).where(eq(period.id, periodId)),
      () => updatePeriodDates("u1", periodId, { startsOn: "2026-11-09", weeks: 2 }, report)
    );
    expect(result).toEqual({ kind: "missing" });
  });

  it("lists the parent's periods newest first, each with its count of sessions", async () => {
    const first = await periodOf("u1", "2026-11-02");
    await sessionOf("u1", first);
    await sessionOf("u1", first);
    const second = await periodOf("u1", "2026-11-16");
    expect(await listPeriods("u1", report)).toEqual([
      { id: second, startsOn: "2026-11-16", weeks: 2, sessionCount: 2 },
      { id: first, startsOn: "2026-11-02", weeks: 2, sessionCount: 2 },
    ]);
    expect(await listPeriods("u2", report)).toEqual([]);
  });

  it("is deleted with its sessions, and only by its parent", async () => {
    const built = await builtPeriod("u1", "2026-11-02");
    expect(await deletePeriod("u2", built.periodId, report)).toBe(false);
    expect(await deletePeriod("u1", built.periodId, report)).toBe(true);
    expect(await database().select().from(trainingSession)).toEqual([]);
    expect(await database().select().from(blockExercise)).toEqual([]);
    expect(lines.at(-1)).toBe(`period deleted: user u1, period ${built.periodId}`);
  });

  it("is never another parent's to read", async () => {
    const id = await periodOf("u1", "2026-11-02");
    expect(await getPeriod("u2", id, report)).toBeNull();
    expect(await getPeriod("u1", "not-an-id", report)).toBeNull();
  });
});

describe("a session", () => {
  it("is added last with a new session's settings, and its total counts its exercises", async () => {
    const built = await builtPeriod("u1", "2026-11-02");
    const second = await sessionOf("u1", built.periodId);
    const detail = await getPeriod("u1", built.periodId, report);
    expect(detail?.sessions).toEqual([
      { id: built.sessionId, position: 1, place: "field", targetMinutes: 45, totalMinutes: 9 },
      { id: second, position: 2, place: "field", targetMinutes: 45, totalMinutes: 0 },
    ]);
    expect((await getSession("u1", second, report))?.equipment).toEqual(NEW_SESSION.equipment);
  });

  it("is refused past 20 in a period, even when added at once", async () => {
    const periodId = await periodOf("u1", "2026-11-02");
    const results = await Promise.all(
      Array.from({ length: 21 }, () => addSession("u1", periodId, report))
    );
    expect(results.filter((result) => result.kind === "saved")).toHaveLength(20);
    expect(results.filter((result) => result.kind === "limit")).toHaveLength(1);
    const positions = (await getPeriod("u1", periodId, report))?.sessions.map(
      (each) => each.position
    );
    expect(positions).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
  });

  it("saves its place, target and equipment, replacing what was at hand", async () => {
    const periodId = await periodOf("u1", "2026-11-02");
    const id = await sessionOf("u1", periodId);
    const settings = { place: "indoors" as const, equipment: ["ball" as const], targetMinutes: 20 };
    expect(await updateSessionSettings("u1", id, settings, report)).toEqual({ kind: "saved", id });
    expect(await getSession("u1", id, report)).toMatchObject(settings);
    await updateSessionSettings("u1", id, { ...settings, equipment: [] }, report);
    expect((await getSession("u1", id, report))?.equipment).toEqual([]);
    expect(await updateSessionSettings("u2", id, settings, report)).toEqual({ kind: "missing" });
  });

  it("is deleted, renumbering those after it", async () => {
    const periodId = await periodOf("u1", "2026-11-02");
    const ids = [
      await sessionOf("u1", periodId),
      await sessionOf("u1", periodId),
      await sessionOf("u1", periodId),
    ];
    expect(await deleteSession("u2", ids[0] as string, report)).toBeNull();
    expect(await deleteSession("u1", ids[0] as string, report)).toBe(periodId);
    expect(
      (await getPeriod("u1", periodId, report))?.sessions.map((each) => [each.id, each.position])
    ).toEqual([
      [ids[1], 1],
      [ids[2], 2],
    ]);
  });

  it("reads its blocks and their exercises in order, with the library's names and durations", async () => {
    const built = await builtPeriod("u1", "2026-11-02");
    const detail = await getSession("u1", built.sessionId, report);
    expect(detail?.blocks.map((each) => [each.position, each.theme])).toEqual([
      [1, "Lämmittely"],
      [2, "Kuljetus"],
    ]);
    expect(detail?.blocks[0]?.exercises.map(({ id: _, ...rest }) => rest)).toEqual([
      {
        position: 1,
        exerciseId: built.ladder,
        name: LADDER.name,
        amountKind: "count",
        amount: 10,
        durationMinutes: 5,
        labels: ["footwork", "field", "ladder"],
      },
      {
        position: 2,
        exerciseId: built.sprint,
        name: SPRINT.name,
        amountKind: "time",
        amount: 30,
        durationMinutes: 4,
        labels: ["speed", "field"],
      },
    ]);
    expect(await getSession("u2", built.sessionId, report)).toBeNull();
  });
});

describe("a block", () => {
  it("is added last, refused past 6, renamed, and logged with ids only", async () => {
    const periodId = await periodOf("u1", "2026-11-02");
    const sessionId = await sessionOf("u1", periodId);
    const ids = [];
    for (let index = 0; index < 6; index += 1) {
      ids.push(await blockOf("u1", sessionId, `Osio ${index}`));
    }
    expect(await addBlock("u1", sessionId, "Seitsemäs", report)).toEqual({ kind: "limit" });
    lines = [];
    expect(await updateBlockTheme("u1", ids[0] as string, "Lämmittely", report)).toBe(sessionId);
    expect(lines).toEqual([`block updated: user u1, block ${ids[0]}`]);
    expect(await updateBlockTheme("u2", ids[0] as string, "Vieras", report)).toBeNull();
    expect(await addBlock("u2", sessionId, "Vieras", report)).toEqual({ kind: "missing" });
  });

  it("moves up and down by swapping, and not past either end", async () => {
    const periodId = await periodOf("u1", "2026-11-02");
    const sessionId = await sessionOf("u1", periodId);
    const first = await blockOf("u1", sessionId, "Yksi");
    const second = await blockOf("u1", sessionId, "Kaksi");
    const themes = async () =>
      (await getSession("u1", sessionId, report))?.blocks.map((each) => each.theme);
    expect(await moveBlock("u1", second, "up", report)).toBe(sessionId);
    expect(await themes()).toEqual(["Kaksi", "Yksi"]);
    lines = [];
    expect(await moveBlock("u1", second, "up", report)).toBe(sessionId);
    expect(lines).toEqual([]);
    await moveBlock("u1", second, "down", report);
    expect(await themes()).toEqual(["Yksi", "Kaksi"]);
    expect(await moveBlock("u2", first, "down", report)).toBeNull();
  });

  it("is deleted with its exercises, renumbering those after it", async () => {
    const built = await builtPeriod("u1", "2026-11-02");
    const third = await blockOf("u1", built.sessionId, "Loppuverryttely");
    expect(await deleteBlock("u1", built.warmUp, report)).toBe(built.sessionId);
    const detail = await getSession("u1", built.sessionId, report);
    expect(detail?.blocks.map((each) => [each.id, each.position])).toEqual([
      [expect.any(String), 1],
      [third, 2],
    ]);
    expect(await database().select().from(blockExercise)).toEqual([]);
    expect(await deleteBlock("u2", third, report)).toBeNull();
  });
});

describe("an exercise in a block", () => {
  it("takes the library's kind and amount, and keeps its own when the library's changes", async () => {
    const built = await builtPeriod("u1", "2026-11-02");
    const reading = readExercise(valuesFrom({ ...LADDER, amount: 20 }));
    if (!reading.ok) {
      throw new Error("the fixture is valid");
    }
    await updateExercise("u1", built.ladder, reading.exercise, report);
    const [ladder] = (await getSession("u1", built.sessionId, report))?.blocks[0]?.exercises ?? [];
    expect(ladder).toMatchObject({ amountKind: "count", amount: 10 });
    expect(await blockExerciseKind("u1", ladder?.id ?? "", report)).toBe("count");
    expect(await blockExerciseKind("u2", ladder?.id ?? "", report)).toBeNull();
  });

  it("saves its own amount, leaving the library's as it was", async () => {
    const built = await builtPeriod("u1", "2026-11-02");
    const [ladder] = (await getSession("u1", built.sessionId, report))?.blocks[0]?.exercises ?? [];
    expect(await updateBlockExerciseAmount("u1", ladder?.id ?? "", 15, report)).toBe(
      built.sessionId
    );
    expect((await getSession("u1", built.sessionId, report))?.blocks[0]?.exercises[0]?.amount).toBe(
      15
    );
    const [library] = await database().select().from(exercise).where(eq(exercise.id, built.ladder));
    expect(library?.amount).toBe(10);
    expect(await updateBlockExerciseAmount("u2", ladder?.id ?? "", 5, report)).toBeNull();
  });

  it("is refused past 10 in a block, and for another parent's exercise or block", async () => {
    const ladder = await exerciseOf("u1", LADDER);
    const periodId = await periodOf("u1", "2026-11-02");
    const sessionId = await sessionOf("u1", periodId);
    const blockId = await blockOf("u1", sessionId, "Lämmittely");
    for (let index = 0; index < 10; index += 1) {
      await added("u1", blockId, ladder);
    }
    expect(await addBlockExercise("u1", blockId, ladder, report)).toEqual({ kind: "limit" });
    const theirs = await exerciseOf("u2", { ...LADDER, name: "Vieras" });
    const other = await blockOf("u1", sessionId, "Toinen");
    expect(await addBlockExercise("u1", other, theirs, report)).toEqual({ kind: "missing" });
    expect(await addBlockExercise("u2", other, theirs, report)).toEqual({ kind: "missing" });
  });

  it("moves within its block and is taken out, renumbering those after it", async () => {
    const built = await builtPeriod("u1", "2026-11-02");
    const ids = async () =>
      (await getSession("u1", built.sessionId, report))?.blocks[0]?.exercises.map((each) => [
        each.exerciseId,
        each.position,
      ]);
    const [first, second] =
      (await getSession("u1", built.sessionId, report))?.blocks[0]?.exercises ?? [];
    expect(await moveBlockExercise("u1", second?.id ?? "", "up", report)).toBe(built.sessionId);
    expect(await ids()).toEqual([
      [built.sprint, 1],
      [built.ladder, 2],
    ]);
    expect(await deleteBlockExercise("u1", second?.id ?? "", report)).toBe(built.sessionId);
    expect(await ids()).toEqual([[built.ladder, 1]]);
    expect(await moveBlockExercise("u2", first?.id ?? "", "up", report)).toBeNull();
    expect(await deleteBlockExercise("u2", first?.id ?? "", report)).toBeNull();
  });
});

describe("the log", () => {
  it("has one line per write, naming the user and the row by id, and no text", async () => {
    const ladder = await exerciseOf("u1", LADDER);
    lines = [];
    const periodId = await periodOf("u1", "2026-11-02");
    await updatePeriodDates("u1", periodId, { startsOn: "2026-11-03", weeks: 2 }, report);
    const sessionId = await sessionOf("u1", periodId);
    await updateSessionSettings("u1", sessionId, NEW_SESSION, report);
    const first = await blockOf("u1", sessionId, "Lämmittely");
    const second = await blockOf("u1", sessionId, "Kuljetus");
    await updateBlockTheme("u1", first, "Alku", report);
    await moveBlock("u1", second, "up", report);
    await added("u1", first, ladder);
    await added("u1", first, ladder);
    const [one, two] =
      (await getSession("u1", sessionId, report))?.blocks.find((each) => each.id === first)
        ?.exercises ?? [];
    await updateBlockExerciseAmount("u1", one?.id ?? "", 12, report);
    await moveBlockExercise("u1", two?.id ?? "", "up", report);
    await deleteBlockExercise("u1", one?.id ?? "", report);
    await deleteBlock("u1", second, report);
    await deleteSession("u1", sessionId, report);
    await deletePeriod("u1", periodId, report);
    expect(lines).toEqual([
      `period created: user u1, period ${periodId}, from none`,
      `period updated: user u1, period ${periodId}`,
      `session created: user u1, session ${sessionId}`,
      `session updated: user u1, session ${sessionId}`,
      `block created: user u1, block ${first}`,
      `block created: user u1, block ${second}`,
      `block updated: user u1, block ${first}`,
      `block moved: user u1, block ${second}`,
      `block exercise created: user u1, block exercise ${one?.id}`,
      `block exercise created: user u1, block exercise ${two?.id}`,
      `block exercise updated: user u1, block exercise ${one?.id}`,
      `block exercise moved: user u1, block exercise ${two?.id}`,
      `block exercise deleted: user u1, block exercise ${one?.id}`,
      `block deleted: user u1, block ${second}`,
      `session deleted: user u1, session ${sessionId}`,
      `period deleted: user u1, period ${periodId}`,
    ]);
  });
});

describe("writes to neighbours at once", () => {
  const ROUNDS = 10;

  it("move and delete neighbouring blocks without a deadlock, positions kept whole", async () => {
    const periodId = await periodOf("u1", "2026-11-02");
    for (let round = 0; round < ROUNDS; round++) {
      const sessionId = await sessionOf("u1", periodId);
      const first = await blockOf("u1", sessionId, "Yksi");
      const second = await blockOf("u1", sessionId, "Kaksi");
      const third = await blockOf("u1", sessionId, "Kolme");
      await Promise.all([
        moveBlock("u1", first, "down", report),
        deleteBlock("u1", second, report),
        moveBlock("u1", second, "up", report),
      ]);
      const blocks = (await getSession("u1", sessionId, report))?.blocks ?? [];
      expect(blocks.map((each) => each.position)).toEqual([1, 2]);
      expect(new Set(blocks.map((each) => each.id))).toEqual(new Set([first, third]));
      await deleteSession("u1", sessionId, report);
    }
  });

  it("move and delete neighbouring exercises of a block without a deadlock", async () => {
    const built = await builtPeriod("u1", "2026-11-02");
    for (let round = 0; round < ROUNDS; round++) {
      await added("u1", built.warmUp, built.ladder);
      const before = (await getSession("u1", built.sessionId, report))?.blocks[0]?.exercises ?? [];
      const [first, second] = before;
      await Promise.all([
        moveBlockExercise("u1", first?.id ?? "", "down", report),
        deleteBlockExercise("u1", second?.id ?? "", report),
        moveBlockExercise("u1", second?.id ?? "", "up", report),
      ]);
      const after = (await getSession("u1", built.sessionId, report))?.blocks[0]?.exercises ?? [];
      expect(after.map((each) => each.position)).toEqual([1, 2]);
      expect(new Set(after.map((each) => each.id))).toEqual(
        new Set(before.filter((each) => each !== second).map((each) => each.id))
      );
    }
  });

  it("delete neighbouring sessions without a deadlock, renumbering what is left", async () => {
    const periodId = await periodOf("u1", "2026-11-02");
    for (let round = 0; round < ROUNDS; round++) {
      const first = await sessionOf("u1", periodId);
      const second = await sessionOf("u1", periodId);
      const third = await sessionOf("u1", periodId);
      await Promise.all([deleteSession("u1", first, report), deleteSession("u1", second, report)]);
      const sessions = (await getPeriod("u1", periodId, report))?.sessions ?? [];
      expect(sessions.map((each) => [each.id, each.position])).toEqual([[third, 1]]);
      await deleteSession("u1", sessions[0]?.id ?? "", report);
    }
  });
});

describe("a library exercise in use", () => {
  it("is refused deletion, naming the periods that use it, earliest first", async () => {
    const built = await builtPeriod("u1", "2026-11-02");
    const copy = await periodOf("u1", "2026-11-16");
    lines = [];
    expect(await deleteExercise("u1", built.ladder, report)).toEqual({
      kind: "inUse",
      periods: [
        { id: built.periodId, startsOn: "2026-11-02", weeks: 2 },
        { id: copy, startsOn: "2026-11-16", weeks: 2 },
      ],
    });
    expect(lines).toEqual([`exercise refused, in use: user u1, exercise ${built.ladder}`]);
    expect(
      await database().select().from(exercise).where(eq(exercise.id, built.ladder))
    ).toHaveLength(1);
  });

  it("is refused by the key when a block takes it while it is being deleted", async () => {
    const ladder = await exerciseOf("u1", LADDER);
    const periodId = await periodOf("u1", "2026-11-02");
    const sessionId = await sessionOf("u1", periodId);
    const blockId = await blockOf("u1", sessionId, "Lämmittely");
    const result = await whileHeld(
      (tx) =>
        tx.insert(blockExercise).values({
          id: randomUUID(),
          blockId,
          exerciseId: ladder,
          position: 1,
          amountKind: "count",
          amount: 10,
        }),
      () => deleteExercise("u1", ladder, report)
    );
    expect(result).toEqual({
      kind: "inUse",
      periods: [{ id: periodId, startsOn: "2026-11-02", weeks: 2 }],
    });
  });

  it("is not found by a block taking it while it is being deleted", async () => {
    const ladder = await exerciseOf("u1", LADDER);
    const periodId = await periodOf("u1", "2026-11-02");
    const sessionId = await sessionOf("u1", periodId);
    const blockId = await blockOf("u1", sessionId, "Lämmittely");
    const result = await whileHeld(
      (tx) => tx.delete(exercise).where(eq(exercise.id, ladder)),
      () => addBlockExercise("u1", blockId, ladder, report)
    );
    expect(result).toEqual({ kind: "missing" });
    expect(await database().select().from(blockExercise)).toEqual([]);
  });

  it("is deleted once no period uses it", async () => {
    const built = await builtPeriod("u1", "2026-11-02");
    await deletePeriod("u1", built.periodId, report);
    expect(await deleteExercise("u1", built.ladder, report)).toEqual({ kind: "deleted" });
  });

  it("goes with its parent's account, with every period using it", async () => {
    await builtPeriod("u1", "2026-11-02");
    await deleteUsers(eq(user.id, "u1"));
    expect(await database().select().from(period)).toEqual([]);
    expect(await database().select().from(exercise)).toEqual([]);
  });
});

describe("the database's own checks", () => {
  const periodRow = (values: Partial<typeof period.$inferInsert>) =>
    database()
      .insert(period)
      .values({ id: randomUUID(), userId: "u1", startsOn: "2026-11-02", weeks: 2, ...values });

  it.each([
    ["a length of 0 weeks", { weeks: 0 }, false],
    ["a length of 1 week", { weeks: 1 }, true],
    ["a length of 4 weeks", { weeks: 4 }, true],
    ["a length of 5 weeks", { weeks: 5 }, false],
  ] as const)("take a period of %s: %s", async (_case, values, accepted) => {
    const write = periodRow(values);
    if (accepted) {
      await expect(write).resolves.toBeDefined();
    } else {
      await expect(write).rejects.toThrow();
    }
  });

  it("refuse overlapping days for one parent, and take touching ones", async () => {
    await periodRow({ startsOn: "2026-11-02", weeks: 1 });
    await expect(periodRow({ startsOn: "2026-11-08", weeks: 1 })).rejects.toThrow();
    await expect(periodRow({ startsOn: "2026-11-09", weeks: 1 })).resolves.toBeDefined();
  });

  it.each([
    ["a position of 0", { position: 0 }, false],
    ["a place not on the list", { place: "beach" }, false],
    ["a target of 0", { targetMinutes: 0 }, false],
    ["a target of 5", { targetMinutes: 5 }, true],
    ["a target of 7", { targetMinutes: 7 }, false],
    ["a target of 120", { targetMinutes: 120 }, true],
    ["a target of 125", { targetMinutes: 125 }, false],
  ] as const)("take a session with %s: %s", async (_case, values, accepted) => {
    const periodId = await periodOf("u1", "2026-11-02");
    const write = database()
      .insert(trainingSession)
      .values({
        id: randomUUID(),
        periodId,
        position: 1,
        place: "field",
        targetMinutes: 45,
        ...values,
      });
    if (accepted) {
      await expect(write).resolves.toBeDefined();
    } else {
      await expect(write).rejects.toThrow();
    }
  });

  it("refuse an equipment key not on the list, and a place among the equipment", async () => {
    const periodId = await periodOf("u1", "2026-11-02");
    const sessionId = await sessionOf("u1", periodId);
    await database().delete(trainingSessionEquipment);
    for (const label of ["paddle", "field"]) {
      await expect(
        database().insert(trainingSessionEquipment).values({ sessionId, label })
      ).rejects.toThrow();
    }
  });

  it.each([
    ["an empty theme", "", false],
    ["a theme of 30 characters", "x".repeat(30), true],
    ["a theme of 31 characters", "x".repeat(31), false],
    ["a theme with a space at its end", "Kuljetus ", false],
  ] as const)("take a block with %s: %s", async (_case, theme, accepted) => {
    const periodId = await periodOf("u1", "2026-11-02");
    const sessionId = await sessionOf("u1", periodId);
    const write = database()
      .insert(block)
      .values({ id: randomUUID(), sessionId, position: 1, theme });
    if (accepted) {
      await expect(write).resolves.toBeDefined();
    } else {
      await expect(write).rejects.toThrow();
    }
  });

  it.each([
    ["a count of 0", "count", 0, false],
    ["a count of 100", "count", 100, true],
    ["a count of 101", "count", 101, false],
    ["a time of 5", "time", 5, true],
    ["a time of 7", "time", 7, false],
    ["a time of 605", "time", 605, false],
    ["a kind not on the list", "laps", 5, false],
  ] as const)("take a block exercise with %s: %s", async (_case, amountKind, amount, accepted) => {
    const ladder = await exerciseOf("u1", LADDER);
    const periodId = await periodOf("u1", "2026-11-02");
    const sessionId = await sessionOf("u1", periodId);
    const blockId = await blockOf("u1", sessionId, "Lämmittely");
    const write = database()
      .insert(blockExercise)
      .values({ id: randomUUID(), blockId, exerciseId: ladder, position: 1, amountKind, amount });
    if (accepted) {
      await expect(write).resolves.toBeDefined();
    } else {
      await expect(write).rejects.toThrow();
    }
  });

  it("hold positions unique within a parent at commit, so a swap within one transaction holds", async () => {
    const periodId = await periodOf("u1", "2026-11-02");
    const sessionId = await sessionOf("u1", periodId);
    await expect(
      database()
        .insert(trainingSession)
        .values({ id: randomUUID(), periodId, position: 1, place: "field", targetMinutes: 45 })
    ).rejects.toThrow();
    const other = await sessionOf("u1", periodId);
    await database().transaction(async (tx) => {
      await tx
        .update(trainingSession)
        .set({ position: 2 })
        .where(eq(trainingSession.id, sessionId));
      await tx.update(trainingSession).set({ position: 1 }).where(eq(trainingSession.id, other));
    });
    expect((await getPeriod("u1", periodId, report))?.sessions.map((each) => each.id)).toEqual([
      other,
      sessionId,
    ]);
  });

  it("log a failure with its ids and no text, and pass it on", async () => {
    await expect(
      createPeriod("nobody", { startsOn: "2026-11-02", weeks: 2 }, report)
    ).rejects.toThrow(/^period created failed: user nobody: /);
    await expect(addBlock("u1", randomUUID(), "Lämmittely", report)).resolves.toEqual({
      kind: "missing",
    });
    expect(lines.join("\n")).not.toContain("Lämmittely");
  });
});

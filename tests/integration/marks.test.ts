/**
 * The marks' store against Postgres: which sessions may be marked, its
 * checks, its locks and its races.
 *
 * decisions/f004-periods-and-sessions.md
 * decisions/f006-session-marks.md
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
import { blockExercise, exercise, sessionMark, trainingSession, user } from "@/lib/db/schema";
import { type Exercise, readExercise, valuesFrom } from "@/lib/exercises/rules";
import { createExercise, deleteExercise } from "@/lib/exercises/store";
import { type Mark, NO_PICKS } from "@/lib/marks/rules";
import { deleteMark, getChildMarks, getMarkPage, saveMark } from "@/lib/marks/store";
import {
  addBlock,
  addBlockExercise,
  addSession,
  createPeriod,
  deleteBlockExercise,
  deletePeriod,
  deleteSession,
  getSession,
} from "@/lib/periods/store";
import { deleteUsers } from "../support/users.ts";

let lines: string[] = [];
const report = (line: string) => {
  lines.push(line);
};

const database = () => getDatabase();

// 5 November 2026: the current period runs 3.–16.11., the previous 20.10.–2.11.
const DAY = "2026-11-05";
const CURRENT = "2026-11-03";
const PREVIOUS = "2026-10-20";
const OLDER = "2026-10-06";
const NEXT = "2026-11-17";

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

const saved = <T extends { kind: string }>(result: T) => {
  if (result.kind !== "saved") {
    throw new Error(`expected a save, got ${result.kind}`);
  }
  return result as Extract<T, { kind: "saved" }>;
};

/** A library exercise saved through readExercise, as every write is. */
const exerciseOf = async (userId: string, values: Exercise) => {
  const reading = readExercise(valuesFrom(values));
  if (!reading.ok) {
    throw new Error(`the fixture breaks a rule: ${JSON.stringify(reading.errors)}`);
  }
  return saved(await createExercise(userId, reading.exercise, report)).id;
};

const periodOf = async (userId: string, startsOn: string) =>
  saved(await createPeriod(userId, { startsOn, weeks: 2 }, report)).id;

const sessionOf = async (userId: string, periodId: string) =>
  saved(await addSession(userId, periodId, report)).id;

/** A session of one block: the ladder, the sprint, then the ladder again. */
const builtSession = async (userId: string, periodId: string) => {
  const ladder = await exerciseOf(userId, LADDER);
  const sprint = await exerciseOf(userId, SPRINT);
  const sessionId = await sessionOf(userId, periodId);
  const blockId = saved(await addBlock(userId, sessionId, "Lämmittely", report)).id;
  for (const each of [ladder, sprint, ladder]) {
    saved(await addBlockExercise(userId, blockId, each, report));
  }
  return { ladder, sprint, sessionId };
};

const DONE: Mark = { status: "done", trainedOn: DAY, feeling: 5, picks: NO_PICKS };

const marks = () => database().select().from(sessionMark);

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
  // A write that fails, or an act that never waits, ends the test rather than hanging it.
  await Promise.race([done, held]);
  let settled = false;
  const acting = act();
  const settle = () => {
    settled = true;
  };
  acting.then(settle, settle);
  while (!settled && !(await waitingOnLock())) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  release();
  await held;
  return acting;
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

describe("a mark", () => {
  it("is saved, read back and replaced, one per session, and logged with ids only", async () => {
    const periodId = await periodOf("u1", CURRENT);
    const { ladder, sprint, sessionId } = await builtSession("u1", periodId);
    const full: Mark = {
      status: "done",
      trainedOn: "2026-11-04",
      feeling: 4,
      picks: { likedBest: ladder, likedLeast: ladder, easiest: sprint, hardest: null },
    };
    lines = [];
    expect(await saveMark("u1", sessionId, full, DAY, report)).toEqual({ kind: "saved" });
    expect((await getMarkPage("u1", sessionId, DAY, report))?.mark).toEqual(full);
    const partly: Mark = { ...full, status: "partly", feeling: null };
    expect(await saveMark("u1", sessionId, partly, DAY, report)).toEqual({ kind: "saved" });
    expect((await getMarkPage("u1", sessionId, DAY, report))?.mark).toEqual(partly);
    expect(await marks()).toHaveLength(1);
    expect(lines).toEqual([
      `session mark saved: user u1, session ${sessionId}`,
      `session mark saved: user u1, session ${sessionId}`,
    ]);
  });

  it("keeps nothing but its status once saved as not done", async () => {
    const periodId = await periodOf("u1", CURRENT);
    const { ladder, sessionId } = await builtSession("u1", periodId);
    await saveMark("u1", sessionId, { ...DONE, picks: { ...NO_PICKS, hardest: ladder } }, DAY);
    const notDone: Mark = { status: "not_done", trainedOn: null, feeling: null, picks: NO_PICKS };
    expect(await saveMark("u1", sessionId, notDone, DAY, report)).toEqual({ kind: "saved" });
    expect((await getMarkPage("u1", sessionId, DAY, report))?.mark).toEqual(notDone);
  });

  it("takes a day from its period's start to today, also after the period ended", async () => {
    const periodId = await periodOf("u1", PREVIOUS);
    const sessionId = await sessionOf("u1", periodId);
    expect(
      await saveMark("u1", sessionId, { ...DONE, trainedOn: "2026-10-19" }, DAY, report)
    ).toEqual({ kind: "early" });
    expect(await marks()).toEqual([]);
    for (const trainedOn of [PREVIOUS, "2026-11-04"]) {
      expect(await saveMark("u1", sessionId, { ...DONE, trainedOn }, DAY, report)).toEqual({
        kind: "saved",
      });
    }
  });

  it("is refused a pick that is not in the session now, and saves nothing", async () => {
    const periodId = await periodOf("u1", CURRENT);
    const { sessionId } = await builtSession("u1", periodId);
    const elsewhere = await exerciseOf("u1", { ...LADDER, name: "Seinäsyötöt" });
    const theirs = await exerciseOf("u2", LADDER);
    for (const pick of [elsewhere, theirs, randomUUID(), "not an id"]) {
      expect(
        await saveMark("u1", sessionId, { ...DONE, picks: { ...NO_PICKS, easiest: pick } }, DAY)
      ).toEqual({ kind: "stale" });
    }
    expect(await marks()).toEqual([]);
  });

  it("is refused for a session the child may not mark, and saves nothing", async () => {
    const olderId = await periodOf("u1", OLDER);
    await periodOf("u1", PREVIOUS);
    await periodOf("u1", CURRENT);
    const nextId = await periodOf("u1", NEXT);
    const older = await sessionOf("u1", olderId);
    const next = await sessionOf("u1", nextId);
    const theirs = await sessionOf("u2", await periodOf("u2", CURRENT));
    for (const id of [older, next, theirs, randomUUID(), "not an id"]) {
      expect(await saveMark("u1", id, DONE, DAY, report)).toEqual({ kind: "missing" });
      expect(await getMarkPage("u1", id, DAY, report)).toBeNull();
      expect(await deleteMark("u1", id, DAY, report)).toBe("missing");
    }
    expect(await marks()).toEqual([]);
  });

  it("is the same one when two first saves of a session come at once", async () => {
    const sessionId = await sessionOf("u1", await periodOf("u1", CURRENT));
    const results = await Promise.all([
      saveMark("u1", sessionId, DONE, DAY, report),
      saveMark("u1", sessionId, { ...DONE, feeling: 1 }, DAY, report),
    ]);
    expect(results).toEqual([{ kind: "saved" }, { kind: "saved" }]);
    expect(await marks()).toHaveLength(1);
  });

  it("is removed, then already gone, and logged with ids only", async () => {
    const sessionId = await sessionOf("u1", await periodOf("u1", CURRENT));
    await saveMark("u1", sessionId, DONE, DAY, report);
    lines = [];
    expect(await deleteMark("u1", sessionId, DAY, report)).toBe("deleted");
    expect(await deleteMark("u1", sessionId, DAY, report)).toBe("absent");
    expect(await marks()).toEqual([]);
    expect(lines).toEqual([`session mark deleted: user u1, session ${sessionId}`]);
  });

  it("is not saved for a session deleted while it is being saved", async () => {
    const sessionId = await sessionOf("u1", await periodOf("u1", CURRENT));
    const result = await whileHeld(
      (tx) => tx.delete(trainingSession).where(eq(trainingSession.id, sessionId)),
      () => saveMark("u1", sessionId, DONE, DAY, report)
    );
    expect(result).toEqual({ kind: "missing" });
    expect(await marks()).toEqual([]);
  });

  it("is refused a pick whose exercise is deleted while it is being saved", async () => {
    const periodId = await periodOf("u1", CURRENT);
    const { sprint, sessionId } = await builtSession("u1", periodId);
    const result = await whileHeld(
      async (tx) => {
        await tx.delete(blockExercise).where(eq(blockExercise.exerciseId, sprint));
        await tx.delete(exercise).where(eq(exercise.id, sprint));
      },
      () =>
        saveMark(
          "u1",
          sessionId,
          { ...DONE, picks: { ...NO_PICKS, likedBest: sprint } },
          DAY,
          report
        )
    );
    expect(result).toEqual({ kind: "stale" });
    expect(await marks()).toEqual([]);
  });

  it("is refused a pick whose exercise leaves the session while it is being saved", async () => {
    const periodId = await periodOf("u1", CURRENT);
    const { sprint, sessionId } = await builtSession("u1", periodId);
    const result = await whileHeld(
      (tx) => tx.delete(blockExercise).where(eq(blockExercise.exerciseId, sprint)),
      () =>
        saveMark(
          "u1",
          sessionId,
          { ...DONE, picks: { ...NO_PICKS, likedBest: sprint } },
          DAY,
          report
        )
    );
    expect(result).toEqual({ kind: "stale" });
    expect(await marks()).toEqual([]);
  });

  it("keeps its pick when the parent removes the exercise from the session", async () => {
    const periodId = await periodOf("u1", CURRENT);
    const { ladder, sprint, sessionId } = await builtSession("u1", periodId);
    await saveMark("u1", sessionId, { ...DONE, picks: { ...NO_PICKS, likedBest: sprint } }, DAY);
    const blocks = (await getSession("u1", sessionId, report))?.blocks ?? [];
    const sprintInBlock = blocks[0]?.exercises.find((each) => each.exerciseId === sprint);
    await deleteBlockExercise("u1", sprintInBlock?.id ?? "", report);
    const page = await getMarkPage("u1", sessionId, DAY, report);
    expect(page?.mark?.picks.likedBest).toBe(sprint);
    expect(page?.exercises.map((each) => each.exerciseId)).toEqual([ladder]);
  });

  it("loses a pick whose library exercise is deleted", async () => {
    const periodId = await periodOf("u1", CURRENT);
    const { sprint, sessionId } = await builtSession("u1", periodId);
    await saveMark("u1", sessionId, { ...DONE, picks: { ...NO_PICKS, hardest: sprint } }, DAY);
    const blocks = (await getSession("u1", sessionId, report))?.blocks ?? [];
    const sprintInBlock = blocks[0]?.exercises.find((each) => each.exerciseId === sprint);
    await deleteBlockExercise("u1", sprintInBlock?.id ?? "", report);
    expect(await deleteExercise("u1", sprint, report)).toEqual({ kind: "deleted" });
    expect((await getMarkPage("u1", sessionId, DAY, report))?.mark?.picks).toEqual(NO_PICKS);
  });

  it("goes with its session, and with its period", async () => {
    const periodId = await periodOf("u1", CURRENT);
    const first = await sessionOf("u1", periodId);
    const second = await sessionOf("u1", periodId);
    for (const id of [first, second]) {
      await saveMark("u1", id, DONE, DAY, report);
    }
    await deleteSession("u1", first, report);
    expect((await marks()).map((each) => each.sessionId)).toEqual([second]);
    await deletePeriod("u1", periodId, report);
    expect(await marks()).toEqual([]);
  });

  it("goes with its parent's account, with the exercise it picks", async () => {
    const { ladder, sessionId } = await builtSession("u1", await periodOf("u1", CURRENT));
    await saveMark("u1", sessionId, { ...DONE, picks: { ...NO_PICKS, easiest: ladder } }, DAY);
    await deleteUsers(eq(user.id, "u1"));
    expect(await marks()).toEqual([]);
  });
});

describe("the marking page", () => {
  it("lists the session's exercises in its order, each once", async () => {
    const periodId = await periodOf("u1", CURRENT);
    const { ladder, sprint, sessionId } = await builtSession("u1", periodId);
    expect(await getMarkPage("u1", sessionId, DAY, report)).toEqual({
      id: sessionId,
      position: 1,
      period: { id: periodId, startsOn: CURRENT, weeks: 2 },
      exercises: [
        { exerciseId: ladder, name: "Tikkaat: perusaskel" },
        { exerciseId: sprint, name: "Lähdöt" },
      ],
      mark: null,
    });
  });
});

describe("the child's marks", () => {
  it("are the current and previous periods' marks, with the previous period's sessions in order", async () => {
    // Every period made before its sessions, since a new period copies the latest one's.
    const [olderId, previousId, currentId, nextId] = [
      await periodOf("u1", OLDER),
      await periodOf("u1", PREVIOUS),
      await periodOf("u1", CURRENT),
      await periodOf("u1", NEXT),
    ];
    const older = await sessionOf("u1", olderId);
    const firstBefore = await sessionOf("u1", previousId);
    const secondBefore = await sessionOf("u1", previousId);
    const now = await sessionOf("u1", currentId);
    await sessionOf("u1", nextId);
    await saveMark("u1", older, { ...DONE, trainedOn: OLDER }, "2026-10-10", report);
    await saveMark("u1", secondBefore, { ...DONE, status: "partly", feeling: null }, DAY, report);
    await saveMark("u1", now, DONE, DAY, report);
    expect(await getChildMarks("u1", DAY, report)).toEqual({
      marks: {
        [secondBefore]: { status: "partly", trainedOn: DAY, feeling: null },
        [now]: { status: "done", trainedOn: DAY, feeling: 5 },
      },
      previous: {
        period: { id: previousId, startsOn: PREVIOUS, weeks: 2 },
        sessions: [
          { id: firstBefore, position: 1 },
          { id: secondBefore, position: 2 },
        ],
      },
    });
    expect(await getChildMarks("u2", DAY, report)).toEqual({ marks: {}, previous: null });
  });

  it("have no previous period before the first ends, and only it after the last", async () => {
    const now = await sessionOf("u1", await periodOf("u1", CURRENT));
    await saveMark("u1", now, DONE, DAY, report);
    expect(await getChildMarks("u1", DAY, report)).toEqual({
      marks: { [now]: { status: "done", trainedOn: DAY, feeling: 5 } },
      previous: null,
    });
    expect((await getChildMarks("u1", "2026-11-20", report)).previous?.sessions).toEqual([
      { id: now, position: 1 },
    ]);
    expect(await saveMark("u1", now, DONE, "2026-11-20", report)).toEqual({ kind: "saved" });
  });
});

describe("the database's own checks", () => {
  const markRow = async (values: Partial<typeof sessionMark.$inferInsert>) => {
    const sessionId = await sessionOf("u1", await periodOf("u1", CURRENT));
    return database()
      .insert(sessionMark)
      .values({ id: randomUUID(), sessionId, status: "done", trainedOn: DAY, ...values });
  };

  it.each([
    ["a status not on the list", { status: "skipped" }, false],
    ["a feeling of 0", { feeling: 0 }, false],
    ["a feeling of 1", { feeling: 1 }, true],
    ["a feeling of 5", { feeling: 5 }, true],
    ["a feeling of 6", { feeling: 6 }, false],
    ["no day, done", { trainedOn: null }, false],
    ["a day, not done", { status: "not_done" }, false],
    ["no day, not done", { status: "not_done", trainedOn: null }, true],
    ["a feeling, not done", { status: "not_done", trainedOn: null, feeling: 3 }, false],
    ["a day before the year 1", { trainedOn: "0001-12-31 BC" }, false],
  ] as const)("take a mark with %s: %s", async (_case, values, accepted) => {
    const write = markRow(values);
    if (accepted) {
      await expect(write).resolves.toBeDefined();
    } else {
      await expect(write).rejects.toThrow();
    }
  });

  it("refuse a pick, not done", async () => {
    const ladder = await exerciseOf("u1", LADDER);
    await expect(
      markRow({ status: "not_done", trainedOn: null, likedBestExerciseId: ladder })
    ).rejects.toThrow();
  });

  it("log a failure with its ids and no values, and pass it on", async () => {
    const sessionId = await sessionOf("u1", await periodOf("u1", CURRENT));
    await expect(saveMark("u1", sessionId, { ...DONE, feeling: 9 }, DAY, report)).rejects.toThrow(
      new RegExp(`^session mark saved failed: user u1, session ${sessionId}: `)
    );
    expect(lines.at(-1)).toMatch(/^session mark saved failed: /);
    expect(lines.at(-1)).not.toContain("2026-11-05");
  });
});

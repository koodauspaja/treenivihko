/**
 * The progress's reads against Postgres: the periods that have started and
 * their marks, the picks' counts, and a period's marks on the trainer side.
 *
 * decisions/f004-periods-and-sessions.md
 * decisions/f006-session-marks.md
 * decisions/f007-progress.md
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
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
import { user } from "@/lib/db/schema";
import { type Exercise, readExercise, valuesFrom } from "@/lib/exercises/rules";
import { createExercise, deleteExercise, updateExercise } from "@/lib/exercises/store";
import { type Mark, NO_PICKS } from "@/lib/marks/rules";
import { saveMark } from "@/lib/marks/store";
import { NEW_SESSION } from "@/lib/periods/rules";
import {
  addBlock,
  addBlockExercise,
  addSession,
  createPeriod,
  deleteBlockExercise,
  getSession,
  updatePeriodDates,
  updateSessionSettings,
} from "@/lib/periods/store";
import { getPeriodMarks, getProgress } from "@/lib/progress/store";
import { deleteUsers } from "../support/users.ts";

let lines: string[] = [];
const report = (line: string) => {
  lines.push(line);
};

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

const checked = (values: Exercise) => {
  const reading = readExercise(valuesFrom(values));
  if (!reading.ok) {
    throw new Error(`the fixture breaks a rule: ${JSON.stringify(reading.errors)}`);
  }
  return reading.exercise;
};

const exerciseOf = async (userId: string, values: Exercise) =>
  saved(await createExercise(userId, checked(values), report)).id;

const periodOf = async (userId: string, startsOn: string) =>
  saved(await createPeriod(userId, { startsOn, weeks: 2 }, report)).id;

/** A session of one block holding `exercises` in order, or of no block when there are none. */
const sessionWith = async (userId: string, periodId: string, exercises: readonly string[] = []) => {
  const sessionId = saved(await addSession(userId, periodId, report)).id;
  if (exercises.length > 0) {
    const blockId = saved(await addBlock(userId, sessionId, "Lämmittely", report)).id;
    for (const each of exercises) {
      saved(await addBlockExercise(userId, blockId, each, report));
    }
  }
  return sessionId;
};

const marked = async (sessionId: string, mark: Partial<Mark>, day = DAY) =>
  saved(
    await saveMark(
      "u1",
      sessionId,
      { status: "done", trainedOn: day, feeling: null, picks: NO_PICKS, ...mark },
      day,
      report
    )
  );

/** The library exercises in a session's blocks, by id. */
const exercisesIn = async (sessionId: string) =>
  ((await getSession("u1", sessionId, report))?.blocks ?? []).flatMap((block) =>
    block.exercises.map((each) => ({ id: each.id, exerciseId: each.exerciseId }))
  );

/** Takes an exercise out of the session, as the parent does; one that stays fails the test. */
const removeFromSession = async (sessionId: string, exerciseId: string) => {
  const inBlock = (await exercisesIn(sessionId)).find((each) => each.exerciseId === exerciseId);
  if (inBlock === undefined) {
    throw new Error("the fixture's exercise is not in the session");
  }
  expect(await deleteBlockExercise("u1", inBlock.id, report)).toBe(sessionId);
  expect((await exercisesIn(sessionId)).map((each) => each.exerciseId)).not.toContain(exerciseId);
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
    await getDatabase()
      .insert(user)
      .values({ id, name: "Test Parent", email: `${id}@example.com` });
  }
});

afterAll(async () => {
  await deleteUsers();
  await closeDatabase();
});

describe("the child's progress", () => {
  it("is every period that has started, newest first, its sessions in order with their marks, and the picks counted over them all", async () => {
    // Every period made before its sessions, since a new period copies the latest one's.
    const [olderId, previousId, currentId, nextId] = [
      await periodOf("u1", OLDER),
      await periodOf("u1", PREVIOUS),
      await periodOf("u1", CURRENT),
      await periodOf("u1", NEXT),
    ];
    const ladder = await exerciseOf("u1", LADDER);
    const sprint = await exerciseOf("u1", SPRINT);
    const older = await sessionWith("u1", olderId, [ladder, sprint]);
    const olderUnmarked = await sessionWith("u1", olderId);
    const first = await sessionWith("u1", currentId, [ladder, sprint]);
    const second = await sessionWith("u1", currentId, [sprint]);
    const third = await sessionWith("u1", currentId);
    await sessionWith("u1", nextId, [ladder]);
    await marked(
      older,
      { picks: { ...NO_PICKS, likedBest: ladder, hardest: sprint } },
      "2026-10-10"
    );
    await marked(first, {
      status: "partly",
      feeling: 4,
      picks: { likedBest: sprint, likedLeast: sprint, easiest: ladder, hardest: null },
    });
    await marked(second, { status: "not_done", trainedOn: null });
    // An update writes the row anew, after the others, so only the order by position keeps it first.
    saved(await updateSessionSettings("u1", first, NEW_SESSION, report));
    lines = [];

    expect(await getProgress("u1", DAY, report)).toEqual({
      periods: [
        {
          id: currentId,
          startsOn: CURRENT,
          weeks: 2,
          sessions: [
            { id: first, position: 1, mark: { status: "partly", trainedOn: DAY, feeling: 4 } },
            {
              id: second,
              position: 2,
              mark: { status: "not_done", trainedOn: null, feeling: null },
            },
            { id: third, position: 3, mark: null },
          ],
        },
        { id: previousId, startsOn: PREVIOUS, weeks: 2, sessions: [] },
        {
          id: olderId,
          startsOn: OLDER,
          weeks: 2,
          sessions: [
            {
              id: older,
              position: 1,
              mark: { status: "done", trainedOn: "2026-10-10", feeling: null },
            },
            { id: olderUnmarked, position: 2, mark: null },
          ],
        },
      ],
      // Liked best once each, so the one picked more often in all comes first.
      exercises: [
        {
          exerciseId: sprint,
          name: "Lähdöt",
          counts: { likedBest: 1, likedLeast: 1, easiest: 0, hardest: 1 },
        },
        {
          exerciseId: ladder,
          name: "Tikkaat: perusaskel",
          counts: { likedBest: 1, likedLeast: 0, easiest: 1, hardest: 0 },
        },
      ],
    });
    expect(lines).toEqual([]);
    expect(await getProgress("u2", DAY, report)).toEqual({ periods: [], exercises: [] });
  });

  it("is empty before any period has started", async () => {
    await sessionWith("u1", await periodOf("u1", NEXT));
    expect(await getProgress("u1", DAY, report)).toEqual({ periods: [], exercises: [] });
  });

  it("counts a pick whose exercise left its session, by its current name, and not one whose exercise was deleted", async () => {
    const periodId = await periodOf("u1", CURRENT);
    const ladder = await exerciseOf("u1", LADDER);
    const sprint = await exerciseOf("u1", SPRINT);
    const sessionId = await sessionWith("u1", periodId, [ladder, sprint]);
    await marked(sessionId, { picks: { ...NO_PICKS, likedBest: ladder, hardest: sprint } });
    await removeFromSession(sessionId, ladder);
    await removeFromSession(sessionId, sprint);
    saved(
      await updateExercise(
        "u1",
        ladder,
        checked({ ...LADDER, name: "Tikkaat" }),
        { revision: 1 },
        report
      )
    );
    expect(await deleteExercise("u1", sprint, report)).toEqual({ kind: "deleted" });
    expect((await getProgress("u1", DAY, report)).exercises).toEqual([
      {
        exerciseId: ladder,
        name: "Tikkaat",
        counts: { likedBest: 1, likedLeast: 0, easiest: 0, hardest: 0 },
      },
    ]);
  });

  it("leaves out a marked period moved to start after the day, with its picks, until it starts", async () => {
    const periodId = await periodOf("u1", CURRENT);
    const ladder = await exerciseOf("u1", LADDER);
    const sessionId = await sessionWith("u1", periodId, [ladder]);
    await marked(sessionId, { picks: { ...NO_PICKS, likedBest: ladder } });
    saved(await updatePeriodDates("u1", periodId, { startsOn: "2026-11-10", weeks: 2 }, report));
    expect(await getProgress("u1", DAY, report)).toEqual({ periods: [], exercises: [] });
    const later = await getProgress("u1", "2026-11-10", report);
    expect(later.periods.map((each) => each.id)).toEqual([periodId]);
    expect(later.exercises.map((each) => each.exerciseId)).toEqual([ladder]);
  });
});

describe("a period's marks on the trainer side", () => {
  it("are each marked session's mark, its picks by their exercises' current names, one left the session included", async () => {
    const periodId = await periodOf("u1", CURRENT);
    const ladder = await exerciseOf("u1", LADDER);
    const sprint = await exerciseOf("u1", SPRINT);
    const first = await sessionWith("u1", periodId, [ladder, sprint]);
    const second = await sessionWith("u1", periodId, [sprint]);
    await sessionWith("u1", periodId);
    await marked(first, {
      feeling: 5,
      picks: { likedBest: sprint, likedLeast: null, easiest: ladder, hardest: sprint },
    });
    await marked(second, { status: "not_done", trainedOn: null });
    saved(
      await updateExercise(
        "u1",
        ladder,
        checked({ ...LADDER, name: "Tikkaat" }),
        { revision: 1 },
        report
      )
    );
    await removeFromSession(first, sprint);
    lines = [];
    expect(await getPeriodMarks("u1", periodId, report)).toEqual({
      [first]: {
        status: "done",
        trainedOn: DAY,
        feeling: 5,
        picks: { likedBest: "Lähdöt", likedLeast: null, easiest: "Tikkaat", hardest: "Lähdöt" },
      },
      [second]: { status: "not_done", trainedOn: null, feeling: null, picks: NO_PICKS },
    });
    expect(lines).toEqual([]);
  });

  it("are none for another parent's period, or an id that is not one", async () => {
    const periodId = await periodOf("u1", CURRENT);
    await marked(await sessionWith("u1", periodId), {});
    expect(await getPeriodMarks("u2", periodId, report)).toEqual({});
    expect(await getPeriodMarks("u1", "not an id", report)).toEqual({});
  });
});

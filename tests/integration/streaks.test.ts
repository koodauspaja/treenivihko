/**
 * The pauses and the streak's read against Postgres: the pauses' checks and
 * exclusion, the accomplishments recorded on a load, once each, and kept.
 *
 * decisions/f004-periods-and-sessions.md
 * decisions/f006-session-marks.md
 * decisions/f008-streaks-and-accomplishments.md
 */

import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
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
import { accomplishment, pause, user } from "@/lib/db/schema";
import { type Exercise, readExercise, valuesFrom } from "@/lib/exercises/rules";
import { createExercise, updateExercise } from "@/lib/exercises/store";
import { type Mark, NO_PICKS } from "@/lib/marks/rules";
import { deleteMark, saveMark } from "@/lib/marks/store";
import {
  addBlock,
  addBlockExercise,
  addSession,
  createPeriod,
  deletePeriod,
} from "@/lib/periods/store";
import { createPause, deletePause, getAchievements, listPauses } from "@/lib/streaks/store";
import { deleteUsers } from "../support/users.ts";

let lines: string[] = [];
const report = (line: string) => {
  lines.push(line);
};

const database = () => getDatabase();

// Thursday 5 November 2026. The periods run 6.–19.10., 20.10.–2.11. and 3.–16.11.;
// their weeks start on Mondays 5.10., 12.10., 19.10., 26.10. and 2.11.
const DAY = "2026-11-05";
const OLDER = "2026-10-06";
const PREVIOUS = "2026-10-20";
const CURRENT = "2026-11-03";

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

const periodOf = async (userId: string, startsOn: string) =>
  saved(await createPeriod(userId, { startsOn, weeks: 2 }, report)).id;

/** A session of one block holding `exercises`, or of none. */
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

/** A mark saved on its own day, which is then a day the child may mark its period. */
const marked = async (sessionId: string, trainedOn: string, mark: Partial<Mark> = {}) =>
  saved(
    await saveMark(
      "u1",
      sessionId,
      { status: "done", trainedOn, feeling: null, picks: NO_PICKS, ...mark },
      trainedOn,
      report
    )
  );

const kinds = async (userId = "u1") =>
  (
    await database()
      .select({ kind: accomplishment.kind })
      .from(accomplishment)
      .where(eq(accomplishment.userId, userId))
  )
    .map((each) => each.kind)
    .sort();

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

describe("a pause", () => {
  it("is added, listed latest start first, deleted, and logged with ids only", async () => {
    const first = saved(
      await createPause("u1", { startsOn: "2026-10-01", endsOn: "2026-10-07" }, report)
    ).id;
    const second = saved(
      await createPause("u1", { startsOn: "2026-11-03", endsOn: "2026-11-03" }, report)
    ).id;
    expect(await listPauses("u1", report)).toEqual([
      { id: second, startsOn: "2026-11-03", endsOn: "2026-11-03" },
      { id: first, startsOn: "2026-10-01", endsOn: "2026-10-07" },
    ]);
    expect(await deletePause("u1", first, report)).toBe(true);
    expect(await deletePause("u1", first, report)).toBe(false);
    expect(await deletePause("u1", "not an id", report)).toBe(false);
    expect((await listPauses("u1", report)).map((each) => each.id)).toEqual([second]);
    expect(lines).toEqual([
      `pause created: user u1, pause ${first}`,
      `pause created: user u1, pause ${second}`,
      `pause deleted: user u1, pause ${first}`,
    ]);
  });

  it("is refused a day another of the parent's pauses has, first and last days included", async () => {
    const other = saved(
      await createPause("u1", { startsOn: "2026-11-03", endsOn: "2026-11-09" }, report)
    ).id;
    lines = [];
    expect(
      await createPause("u1", { startsOn: "2026-11-09", endsOn: "2026-11-12" }, report)
    ).toEqual({
      kind: "overlap",
      with: { id: other, startsOn: "2026-11-03", endsOn: "2026-11-09" },
    });
    expect(lines).toEqual(["pause refused, overlap: user u1"]);
    saved(await createPause("u1", { startsOn: "2026-11-10", endsOn: "2026-11-12" }, report));
    saved(await createPause("u2", { startsOn: "2026-11-03", endsOn: "2026-11-09" }, report));
  });

  it("is added once when two overlapping ones come at once, the exclusion refusing the other", async () => {
    const results = await Promise.all([
      createPause("u1", { startsOn: "2026-11-03", endsOn: "2026-11-09" }, report),
      createPause("u1", { startsOn: "2026-11-05", endsOn: "2026-11-12" }, report),
    ]);
    expect(results.filter((each) => each.kind === "saved")).toHaveLength(1);
    expect(results.filter((each) => each.kind !== "saved")).toHaveLength(1);
    expect(await listPauses("u1", report)).toHaveLength(1);
  });

  it("logs a failure with its ids and no days, and passes it on", async () => {
    // 183 days, past the rules, so the database's own check refuses it.
    await expect(
      createPause("u1", { startsOn: "2026-01-01", endsOn: "2026-07-02" }, report)
    ).rejects.toThrow(/^pause created failed: user u1: /);
    expect(lines.at(-1)).toMatch(/^pause created failed: user u1: /);
    expect(lines.at(-1)).not.toContain("2026-");
  });

  it("is another parent's to delete, never this one's", async () => {
    const id = saved(
      await createPause("u2", { startsOn: "2026-11-03", endsOn: "2026-11-09" }, report)
    ).id;
    expect(await deletePause("u1", id, report)).toBe(false);
    expect(await listPauses("u1", report)).toEqual([]);
    expect(await listPauses("u2", report)).toHaveLength(1);
  });
});

describe("the database's own checks", () => {
  const pauseRow = (startsOn: string, endsOn: string) =>
    database().insert(pause).values({ id: randomUUID(), userId: "u1", startsOn, endsOn });

  it.each([
    ["one day", "2026-11-03", "2026-11-03", true],
    ["182 days", "2026-01-01", "2026-07-01", true],
    ["183 days", "2026-01-01", "2026-07-02", false],
    ["an end before the start", "2026-11-03", "2026-11-02", false],
    ["a day before the year 1", "0001-12-31 BC", "0001-01-01", false],
  ] as const)("take a pause of %s: %s", async (_case, startsOn, endsOn, accepted) => {
    const write = pauseRow(startsOn, endsOn);
    if (accepted) {
      await expect(write).resolves.toBeDefined();
    } else {
      await expect(write).rejects.toThrow();
    }
  });

  it("refuse an overlapping pause written past the store", async () => {
    await pauseRow("2026-11-03", "2026-11-09");
    await expect(pauseRow("2026-11-09", "2026-11-09")).rejects.toThrow();
  });

  const accomplishmentRow = (values: Partial<typeof accomplishment.$inferInsert>) =>
    database()
      .insert(accomplishment)
      .values({
        id: randomUUID(),
        userId: "u1",
        kind: "sessions_1",
        key: "",
        earnedOn: DAY,
        ...values,
      });

  it.each([
    ["a count", {}, true],
    ["a kind not on the list", { kind: "sessions_2" }, false],
    ["a count with a key", { key: "p1" }, false],
    ["a count with a period's dates", { periodStartsOn: CURRENT, periodWeeks: 2 }, false],
    [
      "a full period",
      { kind: "full_period", key: "p1", periodStartsOn: CURRENT, periodWeeks: 2 },
      true,
    ],
    [
      "a full period with no key",
      { kind: "full_period", periodStartsOn: CURRENT, periodWeeks: 2 },
      false,
    ],
    [
      "a full period with no length",
      { kind: "full_period", key: "p1", periodStartsOn: CURRENT },
      false,
    ],
    ["a full period with no start", { kind: "full_period", key: "p1", periodWeeks: 2 }, false],
    [
      "a full period with a name",
      {
        kind: "full_period",
        key: "p1",
        periodStartsOn: CURRENT,
        periodWeeks: 2,
        exerciseName: "Lähdöt",
      },
      false,
    ],
    [
      "hard became easy with a period's dates",
      {
        kind: "hard_to_easy",
        key: "e1",
        exerciseName: "Lähdöt",
        periodStartsOn: CURRENT,
        periodWeeks: 2,
      },
      false,
    ],
    [
      "a full period of 5 weeks",
      { kind: "full_period", key: "p1", periodStartsOn: CURRENT, periodWeeks: 5 },
      false,
    ],
    ["hard became easy", { kind: "hard_to_easy", key: "e1", exerciseName: "Lähdöt" }, true],
    ["hard became easy with no name", { kind: "hard_to_easy", key: "e1" }, false],
    ["a count with a name", { exerciseName: "Lähdöt" }, false],
  ] as const)("take an accomplishment, %s: %s", async (_case, values, accepted) => {
    const write = accomplishmentRow(values);
    if (accepted) {
      await expect(write).resolves.toBeDefined();
    } else {
      await expect(write).rejects.toThrow();
    }
  });

  it("refuse the same kind and key twice for a parent", async () => {
    await accomplishmentRow({});
    await expect(accomplishmentRow({})).rejects.toThrow();
  });
});

describe("the achievements", () => {
  /** Three periods, one session each: the older and the previous with the ladder, the current with none. */
  const threePeriods = async () => {
    const ids = {
      older: await periodOf("u1", OLDER),
      previous: await periodOf("u1", PREVIOUS),
      current: await periodOf("u1", CURRENT),
    };
    const ladder = saved(await createExercise("u1", checked(LADDER), report)).id;
    return {
      ...ids,
      ladder,
      olderSession: await sessionWith("u1", ids.older, [ladder]),
      previousSession: await sessionWith("u1", ids.previous, [ladder]),
      currentSession: await sessionWith("u1", ids.current),
    };
  };

  it("are the streak from the marks, periods and pauses, and earn what is due on a load, once, logged with ids only", async () => {
    const fixture = await threePeriods();
    // Weeks of 5.10. done in part, so no full period; 12.10. missed; 19.10. and 26.10. not yet marked.
    await marked(fixture.olderSession, "2026-10-07", {
      status: "partly",
      picks: { ...NO_PICKS, hardest: fixture.ladder },
    });
    lines = [];
    const first = await getAchievements("u1", DAY, report);
    expect(first.streak).toEqual({ current: 0, best: 1, thisWeekDone: false });
    expect(first.done).toBe(1);
    expect(first.pause).toBeNull();
    expect(first.earned).toEqual([
      {
        id: expect.any(String),
        kind: "sessions_1",
        earnedOn: DAY,
        periodStartsOn: null,
        periodWeeks: null,
        exerciseName: null,
      },
    ]);
    expect(lines).toEqual([
      `accomplishment earned: user u1, accomplishment ${first.earned[0]?.id}`,
    ]);

    // The previous period done in full, its exercise now easiest; the week of 12.10. paused.
    await marked(fixture.previousSession, "2026-10-28", {
      picks: { ...NO_PICKS, easiest: fixture.ladder },
    });
    saved(await createPause("u1", { startsOn: "2026-10-14", endsOn: "2026-10-14" }, report));
    await marked(fixture.currentSession, "2026-11-04");
    lines = [];
    const second = await getAchievements("u1", DAY, report);
    // 5.10. done, 12.10. paused, 19.10. missed: only 26.10. and the current week run on.
    expect(second.streak).toEqual({ current: 2, best: 2, thisWeekDone: true });
    expect(second.done).toBe(3);
    expect(
      second.earned.map((each) => [each.kind, each.periodStartsOn, each.exerciseName])
    ).toEqual([
      ["sessions_1", null, null],
      ["full_period", PREVIOUS, null],
      ["full_period", CURRENT, null],
      ["hard_to_easy", null, "Tikkaat: perusaskel"],
    ]);
    const earnedNow = second.earned.filter((each) => each.id !== first.earned[0]?.id);
    expect(earnedNow).toHaveLength(3);
    expect([...lines].sort()).toEqual(
      earnedNow.map((each) => `accomplishment earned: user u1, accomplishment ${each.id}`).sort()
    );
    lines = [];
    await getAchievements("u1", DAY, report);
    expect(lines).toEqual([]);
  });

  it("shows the pause that includes the day, and earns a streak length the pause makes", async () => {
    const fixture = await threePeriods();
    await marked(fixture.olderSession, "2026-10-07");
    await marked(fixture.previousSession, "2026-10-21");
    const previous2 = await sessionWith("u1", fixture.previous);
    await marked(previous2, "2026-10-28");
    await marked(fixture.currentSession, "2026-11-04");
    expect((await getAchievements("u1", DAY, report)).streak).toEqual({
      current: 3,
      best: 3,
      thisWeekDone: true,
    });
    expect(await kinds()).not.toContain("streak_4");
    const pauseId = saved(
      await createPause("u1", { startsOn: "2026-10-12", endsOn: DAY }, report)
    ).id;
    const paused = await getAchievements("u1", DAY, report);
    expect(paused.streak).toMatchObject({ current: 4, best: 4 });
    expect(paused.pause).toEqual({ id: pauseId, startsOn: "2026-10-12", endsOn: DAY });
    expect(await kinds()).toContain("streak_4");
    // Deleting the pause shrinks the streak, and takes nothing away.
    await deletePause("u1", pauseId, report);
    expect((await getAchievements("u1", DAY, report)).streak.current).toBe(3);
    expect(await kinds()).toContain("streak_4");
  });

  it("keep what was earned when its mark, its period and its exercise's name change", async () => {
    const fixture = await threePeriods();
    await marked(fixture.olderSession, "2026-10-07", {
      picks: { ...NO_PICKS, hardest: fixture.ladder },
    });
    await marked(fixture.previousSession, "2026-10-21", {
      picks: { ...NO_PICKS, easiest: fixture.ladder },
    });
    await getAchievements("u1", DAY, report);
    const before = await kinds();
    expect(before).toEqual(["full_period", "full_period", "hard_to_easy", "sessions_1"]);
    saved(
      await updateExercise(
        "u1",
        fixture.ladder,
        checked({ ...LADDER, name: "Tikkaat" }),
        { revision: 1 },
        report
      )
    );
    await deleteMark("u1", fixture.previousSession, "2026-10-21", report);
    await deletePeriod("u1", fixture.older, report);
    const after = await getAchievements("u1", DAY, report);
    expect(await kinds()).toEqual(before);
    expect(after.done).toBe(0);
    expect(after.earned.find((each) => each.kind === "hard_to_easy")?.exerciseName).toBe(
      "Tikkaat: perusaskel"
    );
    expect(after.earned.find((each) => each.periodStartsOn === OLDER)?.periodWeeks).toBe(2);
  });

  it("earn each once when two loads come at once", async () => {
    const fixture = await threePeriods();
    await marked(fixture.olderSession, "2026-10-07");
    lines = [];
    const [one, two] = await Promise.all([
      getAchievements("u1", DAY, report),
      getAchievements("u1", DAY, report),
    ]);
    expect(await kinds()).toEqual(["full_period", "sessions_1"]);
    expect(lines).toHaveLength(2);
    expect(one.earned.map((each) => each.id).sort()).toEqual(
      two.earned.map((each) => each.id).sort()
    );
  });

  it("are another parent's own: nothing of this one's shows or earns there", async () => {
    const fixture = await threePeriods();
    await marked(fixture.olderSession, "2026-10-07");
    saved(await createPause("u1", { startsOn: "2026-11-01", endsOn: "2026-11-09" }, report));
    await getAchievements("u1", DAY, report);
    expect(await getAchievements("u2", DAY, report)).toEqual({
      streak: { current: 0, best: 0, thisWeekDone: false },
      pause: null,
      done: 0,
      earned: [],
    });
    expect(await kinds("u2")).toEqual([]);
  });

  it("count only the parent's own periods as covering a week", async () => {
    // The first parent's periods cover 19.10.–1.11.; the second's leave those weeks uncovered.
    await threePeriods();
    // A week from Monday 5.10., so it touches no day of the week after.
    const early = saved(await createPeriod("u2", { startsOn: "2026-10-05", weeks: 1 }, report)).id;
    const late = saved(await createPeriod("u2", { startsOn: CURRENT, weeks: 1 }, report)).id;
    for (const [periodId, trainedOn] of [
      [early, "2026-10-07"],
      [late, "2026-11-04"],
    ] as const) {
      const sessionId = await sessionWith("u2", periodId);
      saved(
        await saveMark(
          "u2",
          sessionId,
          { status: "done", trainedOn, feeling: null, picks: NO_PICKS },
          trainedOn,
          report
        )
      );
    }
    expect((await getAchievements("u2", DAY, report)).streak).toEqual({
      current: 2,
      best: 2,
      thisWeekDone: true,
    });
  });
});

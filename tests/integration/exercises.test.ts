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
import { exercise, exerciseLabel, user } from "@/lib/db/schema";
import {
  type CheckedExercise,
  type Exercise,
  readExercise,
  valuesFrom,
} from "@/lib/exercises/rules";
import {
  createExercise,
  deleteExercise,
  getExercise,
  listExercises,
  updateExercise,
} from "@/lib/exercises/store";

let lines: string[] = [];
const report = (line: string) => {
  lines.push(line);
};

const database = () => getDatabase();

const LADDER: Exercise = {
  name: "Tikkaat: sisään-sisään-ulos",
  instructions: "Kaksi askelta sisään, yksi ulos.",
  videoUrl: "https://example.com/video",
  amountKind: "time",
  amount: 30,
  durationMinutes: 5,
  level: 2,
  warmUp: true,
  labels: ["footwork", "field", "ladder"],
};

/** The exercise through readExercise, as every write is; a fixture that fails it fails the test. */
const checked = (values: Exercise): CheckedExercise => {
  const reading = readExercise(valuesFrom(values));
  if (!reading.ok) {
    throw new Error(`the fixture breaks a rule: ${JSON.stringify(reading.errors)}`);
  }
  return reading.exercise;
};

const saved = async (userId: string, values: Exercise) => {
  const result = await createExercise(userId, checked(values), report);
  if (result.kind !== "saved") {
    throw new Error(`expected a save, got ${result.kind}`);
  }
  return result.id;
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
  await database().delete(user);
  lines = [];
  for (const id of ["u1", "u2"]) {
    await database()
      .insert(user)
      .values({ id, name: "Test Parent", email: `${id}@example.com` });
  }
});

afterAll(async () => {
  await database().delete(user);
  await closeDatabase();
});

describe("adding and reading", () => {
  it("adds an exercise with its labels, reads it back, and logs ids only", async () => {
    const id = await saved("u1", LADDER);
    expect(await getExercise("u1", id, report)).toEqual({ id, ...LADDER });
    expect(await listExercises("u1", report)).toEqual([{ id, ...LADDER }]);
    expect(lines).toEqual([`exercise created: user u1, exercise ${id}`]);
    expect(lines.join("\n")).not.toContain("Tikkaat");
  });

  it("gives the labels back in the list's order, whatever order the rows come in", async () => {
    const id = await saved("u1", { ...LADDER, labels: ["footwork", "field"] });
    await database().delete(exerciseLabel).where(eq(exerciseLabel.exerciseId, id));
    for (const label of ["ladder", "field", "footwork"]) {
      await database().insert(exerciseLabel).values({ exerciseId: id, label });
    }
    expect((await getExercise("u1", id, report))?.labels).toEqual(["footwork", "field", "ladder"]);
  });

  it("keeps one parent's library out of another's reach", async () => {
    const id = await saved("u1", LADDER);
    expect(await getExercise("u2", id, report)).toBeNull();
    expect(await listExercises("u2", report)).toEqual([]);
    expect(await updateExercise("u2", id, checked({ ...LADDER, name: "Vieras" }), report)).toEqual({
      kind: "missing",
    });
    expect(await deleteExercise("u2", id, report)).toBe(false);
    expect((await getExercise("u1", id, report))?.name).toBe(LADDER.name);
  });

  it("lets two parents use the same name", async () => {
    await saved("u1", LADDER);
    expect((await createExercise("u2", checked(LADDER), report)).kind).toBe("saved");
  });
});

describe("an add sent again", () => {
  it("is refused as a name in use, and the first is in the library, once", async () => {
    expect((await createExercise("u1", checked(LADDER), report)).kind).toBe("saved");
    expect(await createExercise("u1", checked(LADDER), report)).toEqual({ kind: "nameInUse" });
    expect(await listExercises("u1", report)).toHaveLength(1);
    expect(lines.filter((line) => line.startsWith("exercise created:"))).toHaveLength(1);
  });
});

describe("an id the store could not have made", () => {
  it.each(["\u0000", "not-a-uuid", ""])(
    "%j is no one's exercise, and asks Postgres nothing",
    async (id) => {
      expect(await getExercise("u1", id, report)).toBeNull();
      expect(await updateExercise("u1", id, checked(LADDER), report)).toEqual({ kind: "missing" });
      expect(await deleteExercise("u1", id, report)).toBe(false);
      expect(lines).toEqual([]);
    }
  );
});

describe("the name", () => {
  it("is refused when the library has it in any case, Finnish letters included", async () => {
    await saved("u1", { ...LADDER, name: "Äijä" });
    expect(await createExercise("u1", checked({ ...LADDER, name: "äIJÄ" }), report)).toEqual({
      kind: "nameInUse",
    });
    expect(lines.at(-1)).toBe("exercise refused, name in use: user u1");
  });

  // The test database's locale folds Ä too, so the index's own definition is what shows it does not rely on one.
  it("is lowercased by ICU, whatever the database's locale", async () => {
    const [index] = await database().execute<{ indexdef: string }>(
      sql`select indexdef from pg_indexes where indexname = 'exercise_user_name_idx'`
    );
    expect(index?.indexdef).toContain(`lower((name COLLATE "und-x-icu"))`);
  });

  it("decides between two saves at once in the database", async () => {
    const results = await Promise.all([
      createExercise("u1", checked(LADDER), report),
      createExercise("u1", checked({ ...LADDER, name: LADDER.name.toUpperCase() }), report),
    ]);
    expect(results.map((result) => result.kind).sort()).toEqual(["nameInUse", "saved"]);
    expect(await listExercises("u1", report)).toHaveLength(1);
  });

  it("is refused on renaming to another exercise's, and kept on a change of case", async () => {
    const first = await saved("u1", LADDER);
    const second = await saved("u1", { ...LADDER, name: "Laukaus" });
    expect(
      await updateExercise("u1", second, checked({ ...LADDER, name: LADDER.name }), report)
    ).toEqual({
      kind: "nameInUse",
    });
    expect(
      await updateExercise(
        "u1",
        first,
        checked({ ...LADDER, name: LADDER.name.toUpperCase() }),
        report
      )
    ).toEqual({ kind: "saved", id: first });
  });
});

describe("saving and deleting", () => {
  it("saves every field and replaces the labels", async () => {
    const id = await saved("u1", LADDER);
    const changed: Exercise = {
      ...LADDER,
      instructions: "Uusi ohje.",
      videoUrl: null,
      amountKind: "count",
      amount: 12,
      durationMinutes: 3,
      level: 1,
      warmUp: false,
      labels: ["agility", "gym"],
    };
    expect(await updateExercise("u1", id, checked(changed), report)).toEqual({ kind: "saved", id });
    expect(await getExercise("u1", id, report)).toEqual({ id, ...changed });
    expect(lines.at(-1)).toBe(`exercise updated: user u1, exercise ${id}`);
  });

  it("says an exercise that is gone is missing, and changes nothing", async () => {
    expect(await updateExercise("u1", "gone", checked(LADDER), report)).toEqual({
      kind: "missing",
    });
    expect(await listExercises("u1", report)).toEqual([]);
  });

  it("deletes an exercise with its labels", async () => {
    const id = await saved("u1", LADDER);
    expect(await deleteExercise("u1", id, report)).toBe(true);
    expect(await getExercise("u1", id, report)).toBeNull();
    expect(await database().select().from(exerciseLabel)).toEqual([]);
    expect(lines.at(-1)).toBe(`exercise deleted: user u1, exercise ${id}`);
    expect(await deleteExercise("u1", id, report)).toBe(false);
  });

  it("goes with the parent", async () => {
    await saved("u1", LADDER);
    await database().delete(user).where(eq(user.id, "u1"));
    expect(await database().select().from(exercise)).toEqual([]);
  });
});

describe("the database's own checks", () => {
  const insert = (values: Partial<typeof exercise.$inferInsert>) =>
    database()
      .insert(exercise)
      .values({
        id: randomUUID(),
        userId: "u1",
        name: `Raw ${randomUUID()}`,
        instructions: "Tee näin.",
        amountKind: "count",
        amount: 10,
        durationMinutes: 5,
        level: 1,
        ...values,
      });

  // Each check at both sides of its boundary, so a loosened rule under the same name fails.
  it.each([
    ["a name of 40 characters", { name: "x".repeat(40) }, true],
    ["a name of 41 characters", { name: "x".repeat(41) }, false],
    ["an empty name", { name: "" }, false],
    ["instructions of 1000 characters", { instructions: "x".repeat(1000) }, true],
    ["instructions of 1001 characters", { instructions: "x".repeat(1001) }, false],
    ["empty instructions", { instructions: "" }, false],
    ["a name with a space at its end", { name: "Raw " }, false],
    ["a name with a no-break space at its start", { name: "\u00a0Raw" }, false],
    [
      "instructions with an ideographic space at their end",
      { instructions: "Tee näin.\u3000" },
      false,
    ],
    ["instructions with a line break at their start", { instructions: "\nTee näin." }, false],
    ["instructions with a line break inside", { instructions: "Tee\nnäin." }, true],
    ["an http video link", { videoUrl: "http://example.com" }, false],
    ["a video link of 500 characters", { videoUrl: `https://${"x".repeat(492)}` }, true],
    ["a video link of 501 characters", { videoUrl: `https://${"x".repeat(493)}` }, false],
    ["a count of 0", { amount: 0 }, false],
    ["a count of 1", { amount: 1 }, true],
    ["a count of 100", { amount: 100 }, true],
    ["a count of 101", { amount: 101 }, false],
    ["a time of 0 seconds", { amountKind: "time", amount: 0 }, false],
    ["a time of 5 seconds", { amountKind: "time", amount: 5 }, true],
    ["a time of 7 seconds", { amountKind: "time", amount: 7 }, false],
    ["a time of 600 seconds", { amountKind: "time", amount: 600 }, true],
    ["a time of 605 seconds", { amountKind: "time", amount: 605 }, false],
    ["an amount kind not on the list", { amountKind: "laps" }, false],
    ["a duration of 0", { durationMinutes: 0 }, false],
    ["a duration of 1", { durationMinutes: 1 }, true],
    ["a duration of 30", { durationMinutes: 30 }, true],
    ["a duration of 31", { durationMinutes: 31 }, false],
    ["a level of 0", { level: 0 }, false],
    ["a level of 1", { level: 1 }, true],
    ["a level of 3", { level: 3 }, true],
    ["a level of 4", { level: 4 }, false],
  ] as const)("take %s: %s", async (_case, values, accepted) => {
    const write = insert(values);
    if (accepted) {
      await expect(write).resolves.toBeDefined();
    } else {
      await expect(write).rejects.toThrow();
    }
  });

  it("refuse a label key not on the list", async () => {
    const id = await saved("u1", LADDER);
    await expect(
      database().insert(exerciseLabel).values({ exerciseId: id, label: "heading" })
    ).rejects.toThrow();
  });

  it("log a failure with its ids and no text, and pass it on", async () => {
    await expect(createExercise("nobody", checked(LADDER), report)).rejects.toThrow(
      /^exercise created failed: user nobody: /
    );
    expect(lines).toEqual([expect.stringMatching(/^exercise created failed: user nobody: /)]);
    expect(lines.join("\n")).not.toContain("Tikkaat");
  });
});

/**
 * The library's store against Postgres: its checks, its names, its revisions
 * and the races between saves.
 *
 * decisions/f002-exercise-library.md
 * decisions/f003-exercise-import.md
 * decisions/f010-exercise-saved-meanwhile.md
 */

import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { and, eq, sql } from "drizzle-orm";
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
  importExercises,
  listExercises,
  updateExercise,
} from "@/lib/exercises/store";
import { whileHeld } from "../support/held.ts";
import { deleteUsers } from "../support/users.ts";

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

/**
 * The exercise through readExercise, as every write is; a fixture that fails it fails the test.
 */
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

describe("adding and reading", () => {
  it("adds an exercise with its labels, reads it back, and logs ids only", async () => {
    const id = await saved("u1", LADDER);
    expect(await getExercise("u1", id, report)).toEqual({ id, ...LADDER, revision: 1 });
    expect(await listExercises("u1", report)).toEqual([{ id, ...LADDER, revision: 1 }]);
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
    expect(
      await updateExercise(
        "u2",
        id,
        checked({ ...LADDER, name: "Vieras" }),
        { revision: 1 },
        report
      )
    ).toEqual({
      kind: "missing",
    });
    expect(await deleteExercise("u2", id, report)).toEqual({ kind: "missing" });
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
      expect(await updateExercise("u1", id, checked(LADDER), { revision: 1 }, report)).toEqual({
        kind: "missing",
      });
      expect(await deleteExercise("u1", id, report)).toEqual({ kind: "missing" });
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
      await updateExercise(
        "u1",
        second,
        checked({ ...LADDER, name: LADDER.name }),
        { revision: 1 },
        report
      )
    ).toEqual({
      kind: "nameInUse",
    });
    expect(
      await updateExercise(
        "u1",
        first,
        checked({ ...LADDER, name: LADDER.name.toUpperCase() }),
        { revision: 1 },
        report
      )
    ).toEqual({ kind: "saved", id: first, revision: 2 });
  });

  it("keeps one of two saves from one revision at once, whole, and refuses the other as changed", async () => {
    const id = await saved("u1", LADDER);
    const indoors = { ...LADDER, name: "Sisällä", labels: ["speed", "indoors"] as const };
    const gym = { ...LADDER, name: "Salilla", labels: ["strength", "gym", "jump_rope"] as const };
    const results = await Promise.all([
      updateExercise("u1", id, checked(indoors), { revision: 1 }, report),
      updateExercise("u1", id, checked(gym), { revision: 1 }, report),
    ]);
    expect(results).toContainEqual({ kind: "saved", id, revision: 2 });
    expect(results).toContainEqual({ kind: "changed", revision: 2 });
    const stored = await getExercise("u1", id, report);
    expect([
      { id, ...indoors, revision: 2 },
      { id, ...gym, revision: 2 },
    ]).toContainEqual(stored);
  });
});

describe("a save's revision", () => {
  it("starts at 1 on an add, an import and a row from before the column, and each save raises it", async () => {
    const id = await saved("u1", LADDER);
    await importExercises("u1", [checked({ ...LADDER, name: "Lähdöt" })], report);
    const [imported] = (await listExercises("u1", report)).filter((each) => each.id !== id);
    expect(imported?.revision).toBe(1);
    const [old] = await database().execute<{ revision: number }>(
      sql`insert into exercise (id, user_id, name, instructions, amount_kind, amount, duration_minutes, level) values (${randomUUID()}, 'u1', 'Vanha', 'Ohje.', 'count', 5, 2, 1) returning revision`
    );
    expect(old?.revision).toBe(1);
    expect(await updateExercise("u1", id, checked(LADDER), { revision: 1 }, report)).toEqual({
      kind: "saved",
      id,
      revision: 2,
    });
    expect(await updateExercise("u1", id, checked(LADDER), { revision: 2 }, report)).toEqual({
      kind: "saved",
      id,
      revision: 3,
    });
    expect((await getExercise("u1", id, report))?.revision).toBe(3);
  });

  it("refuses a save that waited on another from the same revision, once that one commits", async () => {
    const id = await saved("u1", LADDER);
    // The first save holds the row, so the second has read nothing it could have checked first.
    const result = await whileHeld(
      (tx) =>
        tx
          .update(exercise)
          .set({ name: "Ensin", revision: sql`${exercise.revision} + 1` })
          .where(and(eq(exercise.id, id), eq(exercise.revision, 1))),
      () =>
        updateExercise("u1", id, checked({ ...LADDER, name: "Toinen" }), { revision: 1 }, report)
    );
    expect(result).toEqual({ kind: "changed", revision: 2 });
    expect((await getExercise("u1", id, report))?.name).toBe("Ensin");
  });

  it("refuses a save that waited on a writer that does not know the revision", async () => {
    const id = await saved("u1", LADDER);
    // As the version still serving during a deploy saves: the trigger raises the revision.
    const result = await whileHeld(
      (tx) => tx.update(exercise).set({ name: "Vanha versio" }).where(eq(exercise.id, id)),
      () =>
        updateExercise(
          "u1",
          id,
          checked({ ...LADDER, name: "Uusi versio" }),
          { revision: 1 },
          report
        )
    );
    expect(result).toEqual({ kind: "changed", revision: 2 });
    expect((await getExercise("u1", id, report))?.name).toBe("Vanha versio");
  });

  it("refuses a save from an older revision, changing nothing, and says the revision it found", async () => {
    const id = await saved("u1", LADDER);
    await updateExercise("u1", id, checked({ ...LADDER, name: "Ensin" }), { revision: 1 }, report);
    lines = [];
    expect(
      await updateExercise(
        "u1",
        id,
        checked({ ...LADDER, name: "Toinen" }),
        { revision: 1 },
        report
      )
    ).toEqual({ kind: "changed", revision: 2 });
    expect(await getExercise("u1", id, report)).toEqual({
      id,
      ...LADDER,
      name: "Ensin",
      revision: 2,
    });
    expect(lines).toEqual([`exercise refused, changed meanwhile: user u1, exercise ${id}`]);
  });

  it("saves over a change with the revision the refusal found, logged so, and refuses it once changed again", async () => {
    const id = await saved("u1", LADDER);
    await updateExercise("u1", id, checked({ ...LADDER, name: "Ensin" }), { revision: 1 }, report);
    lines = [];
    expect(
      await updateExercise(
        "u1",
        id,
        checked({ ...LADDER, name: "Toinen" }),
        { revision: 2, over: true },
        report
      )
    ).toEqual({ kind: "saved", id, revision: 3 });
    expect(lines).toEqual([`exercise updated: user u1, exercise ${id}, over a change`]);
    expect(
      await updateExercise(
        "u1",
        id,
        checked({ ...LADDER, name: "Kolmas" }),
        { revision: 2, over: true },
        report
      )
    ).toEqual({ kind: "changed", revision: 3 });
    expect((await getExercise("u1", id, report))?.name).toBe("Toinen");
  });

  it("is raised by the database for a writer that does not know it, so a save from before is refused", async () => {
    const id = await saved("u1", LADDER);
    // As the version still serving during a deploy saves: its fields, not the revision.
    await database()
      .update(exercise)
      .set({ name: "Vanhan version tallennus" })
      .where(eq(exercise.id, id));
    expect((await getExercise("u1", id, report))?.revision).toBe(2);
    expect(await updateExercise("u1", id, checked(LADDER), { revision: 1 }, report)).toEqual({
      kind: "changed",
      revision: 2,
    });
    expect(await updateExercise("u1", id, checked(LADDER), { revision: 2 }, report)).toEqual({
      kind: "saved",
      id,
      revision: 3,
    });
  });

  it("says an exercise deleted meanwhile is missing, not changed", async () => {
    const id = await saved("u1", LADDER);
    await deleteExercise("u1", id, report);
    expect(await updateExercise("u1", id, checked(LADDER), { revision: 7 }, report)).toEqual({
      kind: "missing",
    });
  });

  it("tells a change meanwhile before a name in use", async () => {
    await saved("u1", { ...LADDER, name: "Varattu" });
    const id = await saved("u1", LADDER);
    await updateExercise("u1", id, checked(LADDER), { revision: 1 }, report);
    expect(
      await updateExercise(
        "u1",
        id,
        checked({ ...LADDER, name: "Varattu" }),
        { revision: 1 },
        report
      )
    ).toEqual({ kind: "changed", revision: 2 });
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
    expect(await updateExercise("u1", id, checked(changed), { revision: 1 }, report)).toEqual({
      kind: "saved",
      id,
      revision: 2,
    });
    expect(await getExercise("u1", id, report)).toEqual({ id, ...changed, revision: 2 });
    expect(lines.at(-1)).toBe(`exercise updated: user u1, exercise ${id}`);
  });

  it("says an exercise that is gone is missing, and changes nothing", async () => {
    expect(await updateExercise("u1", "gone", checked(LADDER), { revision: 1 }, report)).toEqual({
      kind: "missing",
    });
    expect(await listExercises("u1", report)).toEqual([]);
  });

  it("deletes an exercise with its labels", async () => {
    const id = await saved("u1", LADDER);
    expect(await deleteExercise("u1", id, report)).toEqual({ kind: "deleted" });
    expect(await getExercise("u1", id, report)).toBeNull();
    expect(await database().select().from(exerciseLabel)).toEqual([]);
    expect(lines.at(-1)).toBe(`exercise deleted: user u1, exercise ${id}`);
    expect(await deleteExercise("u1", id, report)).toEqual({ kind: "missing" });
  });

  it("goes with the parent", async () => {
    await saved("u1", LADDER);
    await deleteUsers(eq(user.id, "u1"));
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
    // The trimmed checks' list is \u escapes: a letter or digit from them is not trimmed.
    ["a name ending in u", { name: "Juoksu" }, true],
    ["instructions ending in a hexadecimal digit", { instructions: "Sarjan koko 3a" }, true],
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

describe("an import", () => {
  const SPRINT: Exercise = {
    ...LADDER,
    name: "Lähdöt",
    videoUrl: null,
    amountKind: "count",
    amount: 6,
    warmUp: false,
    labels: ["speed", "gym"],
  };

  it("adds every exercise with its labels in one go, and logs the count only", async () => {
    expect(await importExercises("u1", [checked(LADDER), checked(SPRINT)], report)).toEqual({
      kind: "imported",
      count: 2,
    });
    const library = await listExercises("u1", report);
    expect(
      library.map(({ id: _, ...rest }) => rest).sort((a, b) => a.name.localeCompare(b.name))
    ).toEqual([
      { ...SPRINT, revision: 1 },
      { ...LADDER, revision: 1 },
    ]);
    expect(lines).toEqual(["exercises imported: user u1, 2 exercises"]);
    expect(await listExercises("u2", report)).toEqual([]);
  });

  it("saves none of it when the library took one of its names meanwhile", async () => {
    await saved("u1", { ...SPRINT, name: "LÄHDÖT" });
    lines = [];
    expect(await importExercises("u1", [checked(LADDER), checked(SPRINT)], report)).toEqual({
      kind: "nameInUse",
    });
    expect((await listExercises("u1", report)).map((exercise) => exercise.name)).toEqual([
      "LÄHDÖT",
    ]);
    expect(lines).toEqual(["exercise import refused, name in use: user u1"]);
  });

  it("refuses a deadlock with another write of the same names as the name in use", async () => {
    const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const raw = (name: string) => ({
      id: randomUUID(),
      userId: "u1",
      name,
      instructions: "Tee näin.",
      amountKind: "count",
      amount: 5,
      durationMinutes: 5,
      level: 1,
    });
    // The import takes Lähdöt, then waits on Tikkaat, which this holds; this
    // then claims Lähdöt. The import waited first, so it is the one aborted.
    const other = database().transaction(async (tx) => {
      await tx.insert(exercise).values(raw(LADDER.name));
      await pause(300);
      await tx.insert(exercise).values(raw(SPRINT.name));
    });
    await pause(50);
    const result = await importExercises("u1", [checked(LADDER), checked(SPRINT)], report);
    await other;
    expect(result).toEqual({ kind: "nameInUse" });
    expect(lines).toEqual(["exercise import refused, name in use: user u1"]);
    expect((await listExercises("u1", report)).map((each) => each.name).sort()).toEqual(
      [SPRINT.name, LADDER.name].sort()
    );
    expect(await database().select().from(exerciseLabel)).toEqual([]);
  });

  it("logs a failure with the user's id and no text, and passes it on", async () => {
    await expect(importExercises("nobody", [checked(LADDER)], report)).rejects.toThrow(
      /^exercises imported failed: user nobody: /
    );
    expect(lines).toEqual([expect.stringMatching(/^exercises imported failed: user nobody: /)]);
    expect(lines.join("\n")).not.toContain("Tikkaat");
  });
});

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
import { child, session, trainerPassword, trainerUnlock, user } from "@/lib/db/schema";
import {
  ensureChild,
  lockTrainer,
  passwordState,
  saveNickname,
  setTrainerPassword,
  touchUnlock,
  tryPassword,
} from "@/lib/trainer/store";

const PASSWORD = "the trainer password";
const NOW = new Date("2026-10-27T12:00:00.000Z");
const minutes = (count: number) => new Date(NOW.getTime() + count * 60_000);

let lines: string[] = [];
const report = (line: string) => {
  lines.push(line);
};

const database = () => getDatabase();

async function addParent(id: string, sessionIds: string[]) {
  await database()
    .insert(user)
    .values({ id, name: "Test Parent", email: `${id}@example.com` });
  for (const sessionId of sessionIds) {
    await database()
      .insert(session)
      .values({ id: sessionId, token: `token-${sessionId}`, userId: id, expiresAt: minutes(60) });
  }
}

const passwordRow = async (userId: string) =>
  (await database().select().from(trainerPassword).where(eq(trainerPassword.userId, userId)))[0];

const unlockRow = async (sessionId: string) =>
  (await database().select().from(trainerUnlock).where(eq(trainerUnlock.sessionId, sessionId)))[0];

const attempt = (password: string, now = NOW, sessionId = "s1") =>
  tryPassword({ userId: "u1", sessionId, password }, now, report);

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
  await addParent("u1", ["s1", "s2"]);
});

afterAll(async () => {
  await database().delete(user);
  await closeDatabase();
});

describe("the child's profile", () => {
  it("is created once, without a nickname, even when two loads race", async () => {
    const [first, second] = await Promise.all([
      ensureChild("u1", report),
      ensureChild("u1", report),
    ]);
    expect(first).toEqual(second);
    expect(first?.nickname).toBeNull();
    expect(await database().select().from(child)).toHaveLength(1);
    expect(lines).toEqual([`child created: user u1, child ${first?.id}`]);
  });

  it("saves a nickname, and the greeting reads it back; the log never carries it", async () => {
    const created = await ensureChild("u1", report);
    await saveNickname("u1", "Testi", report);
    expect(await ensureChild("u1", report)).toEqual({ id: created.id, nickname: "Testi" });
    expect(lines.at(-1)).toBe(`child nickname updated: user u1, child ${created.id}`);
    expect(lines.join("\n")).not.toContain("Testi");
  });

  it("refuses a nickname over 20 characters in the database too, and logs no value", async () => {
    const nickname = "x".repeat(21);
    const failure = saveNickname("u1", nickname, report);
    await expect(failure).rejects.toThrow(
      /^child nickname updated failed: user u1: .*child_nickname_length/
    );
    await failure.catch((error: Error) => {
      expect(error.message).not.toContain(nickname);
      expect(error.cause).toBeUndefined();
    });
    expect(lines.at(-1)).toMatch(
      /^child nickname updated failed: user u1: .*child_nickname_length/
    );
    expect(lines.at(-1)).not.toContain(nickname);
  });

  it("logs a failure with its ids, and passes it on", async () => {
    await expect(ensureChild("nobody", report)).rejects.toThrow();
    expect(lines).toEqual([expect.stringMatching(/^child created failed: user nobody: /)]);
  });

  it("goes with the parent", async () => {
    await ensureChild("u1", report);
    await setTrainerPassword("u1", PASSWORD, report);
    await database().delete(user).where(eq(user.id, "u1"));
    expect(await database().select().from(child)).toEqual([]);
    expect(await database().select().from(trainerPassword)).toEqual([]);
  });
});

describe("the password", () => {
  it("is none until the command sets it, stored only as a hash", async () => {
    expect(await passwordState("u1", NOW)).toEqual({ kind: "none" });
    expect(await attempt(PASSWORD)).toEqual({ kind: "none" });
    expect(await setTrainerPassword("u1", PASSWORD, report)).toBe(0);
    expect(await passwordState("u1", NOW)).toEqual({ kind: "ready" });
    const row = await passwordRow("u1");
    expect(row?.passwordHash).not.toContain(PASSWORD);
    expect(lines).toEqual(["trainer password set: user u1, unlocks ended 0"]);
  });

  it("opens the trainer side for this browser only, for 15 minutes", async () => {
    await setTrainerPassword("u1", PASSWORD, report);
    expect(await attempt(PASSWORD)).toEqual({ kind: "unlocked" });
    expect((await unlockRow("s1"))?.expiresAt).toEqual(minutes(15));
    expect(await unlockRow("s2")).toBeUndefined();
    expect(lines.at(-1)).toBe("trainer unlocked: user u1, session s1");
  });

  it("counts wrong passwords, and a right one sets the count back to 0", async () => {
    await setTrainerPassword("u1", PASSWORD, report);
    for (const expected of [1, 2, 3]) {
      expect(await attempt("wrong password")).toEqual({ kind: "wrong" });
      expect((await passwordRow("u1"))?.failedAttempts).toBe(expected);
    }
    expect(lines.at(-1)).toBe("trainer password refused: user u1, failed attempts 3");
    expect(await attempt(PASSWORD)).toEqual({ kind: "unlocked" });
    expect((await passwordRow("u1"))?.failedAttempts).toBe(0);
  });

  it("locks for 15 minutes at the 5th wrong password, from any browser, and counts nothing meanwhile", async () => {
    await setTrainerPassword("u1", PASSWORD, report);
    for (let i = 0; i < 4; i++) {
      await attempt("wrong password");
    }
    expect(await attempt("wrong password")).toEqual({ kind: "locked", until: minutes(15) });
    expect(lines.at(-1)).toBe(
      `trainer password locked out: user u1, until ${minutes(15).toISOString()}`
    );
    expect(await passwordRow("u1")).toMatchObject({ failedAttempts: 0, lockedUntil: minutes(15) });

    expect(await attempt(PASSWORD, minutes(14), "s2")).toEqual({
      kind: "locked",
      until: minutes(15),
    });
    expect(lines.at(-1)).toBe("trainer password refused while locked out: user u1");
    expect(await unlockRow("s2")).toBeUndefined();
    expect(await passwordState("u1", minutes(14))).toEqual({ kind: "locked", until: minutes(15) });

    expect(await attempt(PASSWORD, minutes(15))).toEqual({ kind: "unlocked" });
    expect(await passwordRow("u1")).toMatchObject({ failedAttempts: 0, lockedUntil: null });
  });

  it("counts concurrent wrong tries once each, so a 6th never slips through", async () => {
    await setTrainerPassword("u1", PASSWORD, report);
    for (let i = 0; i < 3; i++) {
      await attempt("wrong password");
    }
    const results = await Promise.all([
      attempt("wrong password"),
      attempt("wrong password"),
      attempt("wrong password"),
    ]);
    expect(results.map((result) => result.kind).sort()).toEqual(["locked", "locked", "wrong"]);
    expect(await passwordRow("u1")).toMatchObject({ failedAttempts: 0, lockedUntil: minutes(15) });
  });

  it("opens nothing with a password replaced while it was being tried", async () => {
    await setTrainerPassword("u1", PASSWORD, report);
    const trying = attempt(PASSWORD);
    await setTrainerPassword("u1", "another trainer password", report);
    const result = await trying;
    if (result.kind === "unlocked") {
      // The try finished before the replacement: the replacement then ended its unlock.
      expect(await unlockRow("s1")).toBeUndefined();
    } else {
      expect(result).toEqual({ kind: "ready" });
    }
  });
});

describe("the unlock", () => {
  beforeEach(async () => {
    await setTrainerPassword("u1", PASSWORD, report);
    await attempt(PASSWORD);
  });

  it("moves on with each use, and ends 15 minutes after the last", async () => {
    expect(await touchUnlock("s1", minutes(10))).toEqual(minutes(25));
    expect(await touchUnlock("s1", minutes(24))).toEqual(minutes(39));
    expect(await touchUnlock("s1", minutes(39))).toBeNull();
    expect(await touchUnlock("s2", minutes(1))).toBeNull();
  });

  it("ends with Lukitse", async () => {
    await lockTrainer("u1", "s1", report);
    expect(await touchUnlock("s1", minutes(1))).toBeNull();
    expect(lines.at(-1)).toBe("trainer locked: user u1, session s1");
  });

  it("ends with its session", async () => {
    await database().delete(session).where(eq(session.id, "s1"));
    expect(await unlockRow("s1")).toBeUndefined();
  });

  it("ends, every one of the parent's and no one else's, when the password is replaced", async () => {
    await attempt(PASSWORD, NOW, "s2");
    await addParent("u2", ["t1"]);
    await database()
      .insert(trainerUnlock)
      .values({ sessionId: "t1", expiresAt: minutes(15) });
    expect(await setTrainerPassword("u1", "another trainer password", report)).toBe(2);
    expect(await unlockRow("s1")).toBeUndefined();
    expect(await unlockRow("s2")).toBeUndefined();
    expect(await unlockRow("t1")).toBeDefined();
    expect(lines.at(-1)).toBe("trainer password set: user u1, unlocks ended 2");
    expect(await attempt(PASSWORD)).toEqual({ kind: "wrong" });
    expect(await attempt("another trainer password")).toEqual({ kind: "unlocked" });
  });
});

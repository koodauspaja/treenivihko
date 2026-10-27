/**
 * The trainer side's reads and writes: the child's profile, the password and
 * its wrong tries, and which browser has the trainer side open. Each write
 * leaves one line in the log, with ids only.
 *
 * decisions/f001-trainer-side.md
 */

import { randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { and, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { toStderr } from "@/lib/auth/allowlist";
import { getDatabase } from "@/lib/db/index";
import { child, session, trainerPassword, trainerUnlock } from "@/lib/db/schema";
import { isLockedOut, LOCKOUT_ATTEMPTS, lockoutEnd, unlockExpiry } from "./rules";

type Report = (line: string) => void;

/**
 * Postgres's reason for a failure, without the query: Drizzle's own message
 * carries the query's values, such as a password's hash or a nickname.
 */
function reasonOf(error: unknown): string {
  if (error instanceof Error && error.cause instanceof Error) {
    return error.cause.message;
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs `work`; on a failure, logs the event, its ids and the reason, and
 * passes on an error that carries no more than that, since Next logs it too.
 */
async function logged<T>(event: string, ids: string, report: Report, work: () => Promise<T>) {
  try {
    return await work();
  } catch (error) {
    const line = `${event} failed: ${ids}: ${reasonOf(error)}`;
    report(line);
    throw new Error(line);
  }
}

export type ChildProfile = { id: string; nickname: string | null };

/** The parent's child, created without a nickname the first time it is asked for. */
export function ensureChild(userId: string, report: Report = toStderr): Promise<ChildProfile> {
  return logged("child created", `user ${userId}`, report, async () => {
    const database = getDatabase();
    const [created] = await database
      .insert(child)
      .values({ id: randomUUID(), userId })
      .onConflictDoNothing({ target: child.userId })
      .returning({ id: child.id, nickname: child.nickname });
    if (created) {
      report(`child created: user ${userId}, child ${created.id}`);
      return created;
    }
    const [found] = await database
      .select({ id: child.id, nickname: child.nickname })
      .from(child)
      .where(eq(child.userId, userId));
    if (!found) {
      throw new Error("the child row was neither created nor found");
    }
    return found;
  });
}

/** Saves an already checked nickname for the parent's child. */
export function saveNickname(userId: string, nickname: string, report: Report = toStderr) {
  return logged("child nickname updated", `user ${userId}`, report, async () => {
    const [saved] = await getDatabase()
      .insert(child)
      .values({ id: randomUUID(), userId, nickname })
      .onConflictDoUpdate({ target: child.userId, set: { nickname, updatedAt: new Date() } })
      .returning({ id: child.id });
    report(`child nickname updated: user ${userId}, child ${saved?.id}`);
  });
}

export type PasswordState = { kind: "none" } | { kind: "locked"; until: Date } | { kind: "ready" };

/** Whether the parent has a password, and whether it is locked out at `now`. */
export async function passwordState(userId: string, now = new Date()): Promise<PasswordState> {
  const [row] = await getDatabase()
    .select({ lockedUntil: trainerPassword.lockedUntil })
    .from(trainerPassword)
    .where(eq(trainerPassword.userId, userId));
  if (!row) {
    return { kind: "none" };
  }
  return isLockedOut(row.lockedUntil, now)
    ? { kind: "locked", until: row.lockedUntil }
    : { kind: "ready" };
}

export type UnlockResult = PasswordState | { kind: "wrong" } | { kind: "unlocked" };

type Attempt = { userId: string; sessionId: string; password: string };

/**
 * Tries a password for the trainer side. A lockout is checked before the
 * hash, and again where the result is written, so a try that raced one that
 * locked it can neither unlock nor count.
 */
export function tryPassword(
  { userId, sessionId, password }: Attempt,
  now = new Date(),
  report: Report = toStderr
): Promise<UnlockResult> {
  return logged("trainer unlock", `user ${userId}, session ${sessionId}`, report, async () => {
    const database = getDatabase();
    const [row] = await database
      .select()
      .from(trainerPassword)
      .where(eq(trainerPassword.userId, userId));
    if (!row) {
      return { kind: "none" };
    }
    if (isLockedOut(row.lockedUntil, now)) {
      report(`trainer password refused while locked out: user ${userId}`);
      return { kind: "locked", until: row.lockedUntil };
    }
    // Not locked now, and still the same password: what the check above relied on.
    const unchanged = and(
      eq(trainerPassword.userId, userId),
      eq(trainerPassword.passwordHash, row.passwordHash),
      or(isNull(trainerPassword.lockedUntil), lte(trainerPassword.lockedUntil, now))
    );
    const correct = await verifyPassword({ hash: row.passwordHash, password });
    if (correct) {
      const unlocked = await database.transaction(async (tx) => {
        const [reset] = await tx
          .update(trainerPassword)
          .set({ failedAttempts: 0, lockedUntil: null, updatedAt: now })
          .where(unchanged)
          .returning({ userId: trainerPassword.userId });
        if (!reset) {
          return false;
        }
        await tx
          .insert(trainerUnlock)
          .values({ sessionId, expiresAt: unlockExpiry(now) })
          .onConflictDoUpdate({
            target: trainerUnlock.sessionId,
            set: { expiresAt: unlockExpiry(now) },
          });
        return true;
      });
      if (unlocked) {
        report(`trainer unlocked: user ${userId}, session ${sessionId}`);
        return { kind: "unlocked" };
      }
      return passwordState(userId, now);
    }
    // The count and the lockout in one statement, so concurrent tries are each counted once.
    const reachesLockout = sql`${trainerPassword.failedAttempts} + 1 >= ${LOCKOUT_ATTEMPTS}`;
    const [counted] = await database
      .update(trainerPassword)
      .set({
        failedAttempts: sql`case when ${reachesLockout} then 0 else ${trainerPassword.failedAttempts} + 1 end`,
        lockedUntil: sql`case when ${reachesLockout} then ${lockoutEnd(now).toISOString()}::timestamptz else null end`,
        updatedAt: now,
      })
      .where(unchanged)
      .returning({
        failedAttempts: trainerPassword.failedAttempts,
        lockedUntil: trainerPassword.lockedUntil,
      });
    if (!counted) {
      return passwordState(userId, now);
    }
    if (counted.lockedUntil !== null) {
      report(
        `trainer password locked out: user ${userId}, until ${counted.lockedUntil.toISOString()}`
      );
      return { kind: "locked", until: counted.lockedUntil };
    }
    report(`trainer password refused: user ${userId}, failed attempts ${counted.failedAttempts}`);
    return { kind: "wrong" };
  });
}

/**
 * Moves this browser's unlock 15 minutes on from `now`, and returns its new
 * end; null when there is none or it has ended, in one statement.
 */
export async function touchUnlock(sessionId: string, now = new Date()): Promise<Date | null> {
  const [touched] = await getDatabase()
    .update(trainerUnlock)
    .set({ expiresAt: unlockExpiry(now) })
    .where(and(eq(trainerUnlock.sessionId, sessionId), gt(trainerUnlock.expiresAt, now)))
    .returning({ expiresAt: trainerUnlock.expiresAt });
  return touched?.expiresAt ?? null;
}

/** Ends this browser's unlock. */
export function lockTrainer(userId: string, sessionId: string, report: Report = toStderr) {
  return logged("trainer locked", `user ${userId}, session ${sessionId}`, report, async () => {
    await getDatabase().delete(trainerUnlock).where(eq(trainerUnlock.sessionId, sessionId));
    report(`trainer locked: user ${userId}, session ${sessionId}`);
  });
}

/**
 * Sets or replaces the parent's password, clears its wrong tries, and ends
 * every open unlock of theirs; returns how many it ended.
 */
export function setTrainerPassword(
  userId: string,
  password: string,
  report: Report = toStderr
): Promise<number> {
  return logged("trainer password set", `user ${userId}`, report, async () => {
    const passwordHash = await hashPassword(password);
    const ended = await getDatabase().transaction(async (tx) => {
      const now = new Date();
      await tx
        .insert(trainerPassword)
        .values({ userId, passwordHash, failedAttempts: 0, lockedUntil: null, updatedAt: now })
        .onConflictDoUpdate({
          target: trainerPassword.userId,
          set: { passwordHash, failedAttempts: 0, lockedUntil: null, updatedAt: now },
        });
      const sessions = tx
        .select({ id: session.id })
        .from(session)
        .where(eq(session.userId, userId));
      const removed = await tx
        .delete(trainerUnlock)
        .where(inArray(trainerUnlock.sessionId, sessions))
        .returning({ sessionId: trainerUnlock.sessionId });
      return removed.length;
    });
    report(`trainer password set: user ${userId}, unlocks ended ${ended}`);
    return ended;
  });
}

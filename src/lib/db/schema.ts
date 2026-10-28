/**
 * The database's tables: Better Auth's four, with the names and columns it
 * checks for at start-up. Each feature's spec adds its own.
 *
 * decisions/023-database.md
 * decisions/029-sign-in.md
 * decisions/f001-trainer-side.md
 * decisions/f002-exercise-library.md
 * decisions/f004-periods-and-sessions.md
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { LABEL_KEYS, labelsIn } from "../exercises/labels";
import { WHITESPACE_SQL } from "../text";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

/** Someone who has signed in: only an address on the allowlist ever becomes one. */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  // Better Auth checks for it; a hook keeps Google's picture out, so it stays empty.
  image: text("image"),
  ...timestamps,
});

/** A signed-in browser: the cookie carries `token`, and every request looks it up. */
export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [index("session_user_id_idx").on(table.userId)]
);

/** The Google account behind a user. Its token columns are Better Auth's and stay empty: none is stored. */
export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    // For email-and-password sign-in, which this app has not: always empty.
    password: text("password"),
    ...timestamps,
  },
  (table) => [index("account_user_id_idx").on(table.userId)]
);

/** Short-lived values of the sign-in flow, such as the OAuth state. */
export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

/** The child, one per signed-in parent: what later features attach marks to. */
export const child = pgTable(
  "child",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    // What the parent types for the greeting; the only personal data here.
    nickname: text("nickname"),
    ...timestamps,
  },
  (table) => [check("child_nickname_length", sql`char_length(${table.nickname}) between 1 and 20`)]
);

/** The app's own password for the trainer side, as a hash, and the count of wrong tries. */
export const trainerPassword = pgTable(
  "trainer_password",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    passwordHash: text("password_hash").notNull(),
    failedAttempts: integer("failed_attempts").default(0).notNull(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [check("trainer_password_failed_attempts", sql`${table.failedAttempts} >= 0`)]
);

/** A signed-in browser with the trainer side open, until `expires_at`; gone with its session. */
export const trainerUnlock = pgTable("trainer_unlock", {
  sessionId: text("session_id")
    .primaryKey()
    .references(() => session.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/** The library: the exercises every session is built from, the parent's own. */
export const exercise = pgTable(
  "exercise",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    instructions: text("instructions").notNull(),
    videoUrl: text("video_url"),
    amountKind: text("amount_kind").notNull(),
    // Times for a count, seconds for a time.
    amount: integer("amount").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    level: integer("level").notNull(),
    warmUp: boolean("warm_up").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    // Lowercased by ICU, the same whatever the database's locale: under C, lower() leaves Ä as it is.
    uniqueIndex("exercise_user_name_idx").on(
      table.userId,
      sql`lower(${table.name} collate "und-x-icu")`
    ),
    check("exercise_name_length", sql`char_length(${table.name}) between 1 and 40`),
    // Trimmed of the same whitespace readExercise trims; line breaks inside are kept.
    check(
      "exercise_name_trimmed",
      sql`${table.name} = btrim(${table.name}, ${sql.raw(WHITESPACE_SQL)})`
    ),
    check(
      "exercise_instructions_trimmed",
      sql`${table.instructions} = btrim(${table.instructions}, ${sql.raw(WHITESPACE_SQL)})`
    ),
    check(
      "exercise_instructions_length",
      sql`char_length(${table.instructions}) between 1 and 1000`
    ),
    check(
      "exercise_video_url",
      sql`${table.videoUrl} is null or (${table.videoUrl} like 'https://%' and char_length(${table.videoUrl}) <= 500)`
    ),
    check(
      "exercise_amount",
      sql`(${table.amountKind} = 'count' and ${table.amount} between 1 and 100) or (${table.amountKind} = 'time' and ${table.amount} between 5 and 600 and ${table.amount} % 5 = 0)`
    ),
    check("exercise_duration", sql`${table.durationMinutes} between 1 and 30`),
    check("exercise_level", sql`${table.level} between 1 and 3`),
  ]
);

/** An exercise's labels, by the list's keys; the database refuses any other. */
export const exerciseLabel = pgTable(
  "exercise_label",
  {
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercise.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.exerciseId, table.label] }),
    check(
      "exercise_label_known",
      sql.raw(`label in (${LABEL_KEYS.map((key) => "'" + key + "'").join(", ")})`)
    ),
  ]
);

const keysIn = (group: "place" | "equipment") =>
  labelsIn(group)
    .map((label) => `'${label.key}'`)
    .join(", ");

// Overlaps and orders are held by the custom migration 0004, which drizzle's
// schema cannot express: an exclusion on a period's days, and positions
// unique within their parent, checked at commit so two can swap.

/**
 * A period of training, the parent's own, 1 to 4 weeks from its start, every
 * day of it in the years 1 to 9999.
 */
export const period = pgTable(
  "period",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    startsOn: date("starts_on", { mode: "string" }).notNull(),
    weeks: integer("weeks").notNull(),
    ...timestamps,
  },
  (table) => [
    index("period_user_id_idx").on(table.userId),
    check("period_weeks", sql`${table.weeks} between 1 and 4`),
    check(
      "period_days",
      sql`${table.startsOn} >= date '0001-01-01' and ${table.startsOn} + (7 * ${table.weeks} - 1) <= date '9999-12-31'`
    ),
  ]
);

/** A session of a period, in its order; `session` is Better Auth's sign-in table. */
export const trainingSession = pgTable(
  "training_session",
  {
    id: text("id").primaryKey(),
    periodId: text("period_id")
      .notNull()
      .references(() => period.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    place: text("place").notNull(),
    targetMinutes: integer("target_minutes").notNull(),
    ...timestamps,
  },
  (table) => [
    check("training_session_position", sql`${table.position} >= 1`),
    check("training_session_place", sql.raw(`place in (${keysIn("place")})`)),
    check(
      "training_session_target",
      sql`${table.targetMinutes} between 5 and 120 and ${table.targetMinutes} % 5 = 0`
    ),
  ]
);

/** The equipment at hand for a session, by the list's keys. */
export const trainingSessionEquipment = pgTable(
  "training_session_equipment",
  {
    sessionId: text("session_id")
      .notNull()
      .references(() => trainingSession.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.label] }),
    check("training_session_equipment_known", sql.raw(`label in (${keysIn("equipment")})`)),
  ]
);

/** A block of a session, in its order, under a theme the parent names. */
export const block = pgTable(
  "block",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => trainingSession.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    theme: text("theme").notNull(),
    ...timestamps,
  },
  (table) => [
    check("block_position", sql`${table.position} >= 1`),
    check("block_theme_length", sql`char_length(${table.theme}) between 1 and 30`),
    check(
      "block_theme_trimmed",
      sql`${table.theme} = btrim(${table.theme}, ${sql.raw(WHITESPACE_SQL)})`
    ),
  ]
);

/**
 * A library exercise in a block, in its order, with the kind and amount it
 * was given. Its exercise is never deleted while it is here. Migration 0004
 * makes that key deferrable, which deleting a whole account needs: the
 * account's exercises and periods go by two cascades.
 */
export const blockExercise = pgTable(
  "block_exercise",
  {
    id: text("id").primaryKey(),
    blockId: text("block_id")
      .notNull()
      .references(() => block.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercise.id),
    position: integer("position").notNull(),
    amountKind: text("amount_kind").notNull(),
    // Times for a count, seconds for a time, as an exercise's own amount.
    amount: integer("amount").notNull(),
    ...timestamps,
  },
  (table) => [
    index("block_exercise_exercise_id_idx").on(table.exerciseId),
    check("block_exercise_position", sql`${table.position} >= 1`),
    check(
      "block_exercise_amount",
      sql`(${table.amountKind} = 'count' and ${table.amount} between 1 and 100) or (${table.amountKind} = 'time' and ${table.amount} between 5 and 600 and ${table.amount} % 5 = 0)`
    ),
  ]
);

/**
 * The database's tables: Better Auth's four, with the names and columns it
 * checks for at start-up. Each feature's spec adds its own.
 *
 * decisions/023-database.md
 * decisions/029-sign-in.md
 * decisions/f001-trainer-side.md
 * decisions/f002-exercise-library.md
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { LABEL_KEYS } from "../exercises/labels";

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
    uniqueIndex("exercise_user_name_idx").on(table.userId, sql`lower(${table.name})`),
    check("exercise_name_length", sql`char_length(${table.name}) between 1 and 40`),
    // Trimmed at both ends, as readExercise stores them; line breaks inside are kept.
    check("exercise_name_trimmed", sql`${table.name} = btrim(${table.name}, E' \\t\\n\\r')`),
    check(
      "exercise_instructions_trimmed",
      sql`${table.instructions} = btrim(${table.instructions}, E' \\t\\n\\r')`
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

/**
 * The database's tables: Better Auth's four, with the names and columns it
 * checks for at start-up. Each feature's spec adds its own.
 *
 * decisions/023-database.md
 * decisions/029-sign-in.md
 * decisions/f001-trainer-side.md
 */

import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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

import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  account,
  child,
  exercise,
  exerciseLabel,
  session,
  trainerPassword,
  trainerUnlock,
  user,
  verification,
} from "@/lib/db/schema";

const config = (table: Parameters<typeof getTableConfig>[0]) => getTableConfig(table);
const columns = (table: Parameters<typeof getTableConfig>[0]) =>
  config(table).columns.map((column) => column.name);

describe("the schema", () => {
  it("names Better Auth's four tables as it asks", () => {
    expect([user, session, account, verification].map((table) => config(table).name)).toEqual([
      "user",
      "session",
      "account",
      "verification",
    ]);
  });

  it("has the columns Better Auth checks for at start-up", () => {
    expect(columns(user)).toEqual(expect.arrayContaining(["email", "email_verified", "image"]));
    expect(columns(account)).toEqual(
      expect.arrayContaining(["account_id", "provider_id", "password"])
    );
  });

  it("indexes what sign-in looks rows up by", () => {
    expect(config(session).indexes.map((index) => index.config.name)).toEqual([
      "session_user_id_idx",
    ]);
    expect(config(account).indexes.map((index) => index.config.name)).toEqual([
      "account_user_id_idx",
    ]);
    expect(config(verification).indexes.map((index) => index.config.name)).toEqual([
      "verification_identifier_idx",
    ]);
  });

  it.each([
    ["session", session],
    ["account", account],
  ] as const)("ties each %s to its user, and deletes it with the user", (_name, table) => {
    const [foreignKey] = config(table).foreignKeys;
    const reference = foreignKey?.reference();
    expect(reference?.columns.map((column) => column.name)).toEqual(["user_id"]);
    expect(reference?.foreignColumns.map((column) => column.name)).toEqual(["id"]);
    expect(getTableConfig(reference?.foreignTable ?? user).name).toBe("user");
    expect(foreignKey?.onDelete).toBe("cascade");
  });

  it.each([
    ["child", child, "user_id", "user"],
    ["trainer_password", trainerPassword, "user_id", "user"],
    ["trainer_unlock", trainerUnlock, "session_id", "session"],
    ["exercise", exercise, "user_id", "user"],
    ["exercise_label", exerciseLabel, "exercise_id", "exercise"],
  ] as const)("deletes each %s row with its %s's owner", (name, table, column, owner) => {
    expect(config(table).name).toBe(name);
    const [foreignKey] = config(table).foreignKeys;
    const reference = foreignKey?.reference();
    expect(reference?.columns.map((each) => each.name)).toEqual([column]);
    expect(getTableConfig(reference?.foreignTable ?? user).name).toBe(owner);
    expect(foreignKey?.onDelete).toBe("cascade");
  });

  it("holds one child per parent, with a nickname of 1 to 20 characters or none", () => {
    expect(config(child).columns.find((column) => column.name === "user_id")?.isUnique).toBe(true);
    expect(config(child).columns.find((column) => column.name === "nickname")?.notNull).toBe(false);
    expect(config(child).checks.map((each) => each.name)).toEqual(["child_nickname_length"]);
    expect(config(trainerPassword).checks.map((each) => each.name)).toEqual([
      "trainer_password_failed_attempts",
    ]);
  });

  it("checks every exercise rule in the database too, and the label against the list", () => {
    expect(config(exercise).checks.map((each) => each.name)).toEqual([
      "exercise_name_length",
      "exercise_name_trimmed",
      "exercise_instructions_trimmed",
      "exercise_instructions_length",
      "exercise_video_url",
      "exercise_amount",
      "exercise_duration",
      "exercise_level",
    ]);
    expect(config(exercise).indexes.map((index) => index.config.name)).toEqual([
      "exercise_user_name_idx",
    ]);
    expect(config(exerciseLabel).checks.map((each) => each.name)).toEqual(["exercise_label_known"]);
  });
});

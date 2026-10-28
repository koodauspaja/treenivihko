import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  accomplishment,
  account,
  block,
  blockExercise,
  child,
  exercise,
  exerciseLabel,
  pause,
  period,
  session,
  sessionMark,
  trainerPassword,
  trainerUnlock,
  trainingSession,
  trainingSessionEquipment,
  user,
  verification,
} from "@/lib/db/schema";

const config = (table: Parameters<typeof getTableConfig>[0]) => getTableConfig(table);
const checkSql = (table: Parameters<typeof getTableConfig>[0], name: string) => {
  const found = config(table).checks.find((each) => each.name === name);
  return found === undefined ? undefined : new PgDialect().sqlToQuery(found.value).sql;
};
const deletes = (table: Parameters<typeof getTableConfig>[0]) =>
  config(table).foreignKeys.map((key) => [
    key.reference().foreignColumns[0]?.name,
    getTableConfig(key.reference().foreignTable).name,
    key.onDelete,
  ]);
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

  it("checks each column rule of a period, its sessions and blocks in the database too", () => {
    expect(config(period).checks.map((each) => each.name)).toEqual(["period_weeks", "period_days"]);
    expect(config(trainingSession).checks.map((each) => each.name)).toEqual([
      "training_session_position",
      "training_session_place",
      "training_session_target",
    ]);
    expect(config(block).checks.map((each) => each.name)).toEqual([
      "block_position",
      "block_theme_length",
      "block_theme_trimmed",
    ]);
    expect(config(blockExercise).checks.map((each) => each.name)).toEqual([
      "block_exercise_position",
      "block_exercise_amount",
    ]);
    expect(checkSql(trainingSession, "training_session_place")).toBe(
      "place in ('field', 'indoors', 'gym')"
    );
    expect(checkSql(trainingSessionEquipment, "training_session_equipment_known")).toBe(
      "label in ('ball', 'ladder', 'hurdles', 'cones', 'goal', 'wall', 'jump_rope')"
    );
  });

  it("deletes a period's rows with it, and never an exercise a block uses", () => {
    expect(deletes(period)).toEqual([["id", "user", "cascade"]]);
    expect(deletes(trainingSession)).toEqual([["id", "period", "cascade"]]);
    expect(deletes(trainingSessionEquipment)).toEqual([["id", "training_session", "cascade"]]);
    expect(deletes(block)).toEqual([["id", "training_session", "cascade"]]);
    expect(deletes(blockExercise)).toEqual([
      ["id", "block", "cascade"],
      ["id", "exercise", "no action"],
    ]);
    expect(config(blockExercise).indexes.map((index) => index.config.name)).toEqual([
      "block_exercise_exercise_id_idx",
    ]);
  });

  it("holds one mark per session, deleted with it, and clears a pick whose exercise is deleted", () => {
    expect(
      config(sessionMark).columns.find((column) => column.name === "session_id")?.isUnique
    ).toBe(true);
    expect(deletes(sessionMark)).toEqual([
      ["id", "training_session", "cascade"],
      ["id", "exercise", "set null"],
      ["id", "exercise", "set null"],
      ["id", "exercise", "set null"],
      ["id", "exercise", "set null"],
    ]);
    expect(config(sessionMark).checks.map((each) => each.name)).toEqual([
      "session_mark_status",
      "session_mark_feeling",
      "session_mark_not_done",
      "session_mark_not_done_empty",
      "session_mark_trained_on",
    ]);
  });

  it("keeps a parent's pauses of 1 to 182 days, deleted with the parent", () => {
    expect(config(pause).name).toBe("pause");
    expect(deletes(pause)).toEqual([["id", "user", "cascade"]]);
    expect(config(pause).indexes.map((index) => index.config.name)).toEqual(["pause_user_id_idx"]);
    expect(config(pause).checks.map((each) => each.name)).toEqual([
      "pause_days",
      "pause_day_bounds",
    ]);
  });

  it("keeps each accomplishment once per parent, kind and key, with each kind's parts checked", () => {
    expect(config(accomplishment).name).toBe("accomplishment");
    expect(deletes(accomplishment)).toEqual([["id", "user", "cascade"]]);
    expect(
      config(accomplishment).uniqueConstraints.map((each) => [
        each.name,
        each.columns.map((column) => column.name),
      ])
    ).toEqual([["accomplishment_user_kind_key", ["user_id", "kind", "key"]]]);
    expect(config(accomplishment).checks.map((each) => each.name)).toEqual([
      "accomplishment_kind",
      "accomplishment_parts",
      "accomplishment_earned_on",
    ]);
    expect(checkSql(accomplishment, "accomplishment_kind")).toBe(
      "kind in ('sessions_1', 'sessions_10', 'sessions_25', 'sessions_50', 'sessions_100', 'streak_4', 'streak_8', 'streak_12', 'streak_26', 'full_period', 'hard_to_easy')"
    );
  });
});

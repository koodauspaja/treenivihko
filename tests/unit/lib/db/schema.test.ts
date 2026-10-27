import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { account, session, user, verification } from "@/lib/db/schema";

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
});

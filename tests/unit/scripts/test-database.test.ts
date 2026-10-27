import { describe, expect, it } from "vitest";
import { integrationDatabaseRefusal } from "../../../scripts/test-database.ts";

describe("integrationDatabaseRefusal", () => {
  it("lets a database whose name ends in _test through", () => {
    expect(
      integrationDatabaseRefusal("postgresql://u:p@localhost:5433/treenivihko_test")
    ).toBeNull();
  });

  it.each([
    [
      "the development database",
      "postgresql://u:p@localhost:5433/treenivihko",
      /not "treenivihko"/,
    ],
    ["no database name", "postgresql://u:p@localhost:5433/", /not "\(none\)"/],
    ["a name with _test in the middle", "postgresql://u:p@h/x_test_real", /not "x_test_real"/],
    ["something that is not a URL", "not a url", /not a connection string/],
    ["nothing", undefined, /TEST_DATABASE_URL is not set/],
    ["an empty value", " ", /TEST_DATABASE_URL is not set/],
  ])("refuses %s", (_name, url, reason) => {
    expect(integrationDatabaseRefusal(url)).toMatch(reason);
  });

  it("reads an encoded database name as Postgres would", () => {
    expect(integrationDatabaseRefusal("postgresql://u:p@h/my%20db_test")).toBeNull();
  });
});

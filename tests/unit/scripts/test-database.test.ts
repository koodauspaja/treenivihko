import { describe, expect, it } from "vitest";
import { integrationDatabaseRefusal } from "../../../scripts/test-database.ts";

describe("integrationDatabaseRefusal", () => {
  it.each([
    ["localhost", "postgresql://u:p@localhost:5433/treenivihko_test"],
    ["127.0.0.1", "postgresql://u:p@127.0.0.1:5432/treenivihko_test"],
    ["::1", "postgresql://u:p@[::1]:5432/treenivihko_test"],
  ])("lets a _test database on %s through", (_host, url) => {
    expect(integrationDatabaseRefusal(url)).toBeNull();
  });

  it.each([
    ["a hosted database", "postgresql://u:p@db.example.com:5432/app_test", /"db\.example\.com"/],
    ["another machine", "postgresql://u:p@192.168.1.20:5432/app_test", /"192\.168\.1\.20"/],
  ])("refuses %s, even with a _test name", (_name, url, reason) => {
    expect(integrationDatabaseRefusal(url)).toMatch(reason);
  });

  it.each([
    [
      "the development database",
      "postgresql://u:p@localhost:5433/treenivihko",
      /not "treenivihko"/,
    ],
    ["no database name", "postgresql://u:p@localhost:5433/", /not "\(none\)"/],
    [
      "a name with _test in the middle",
      "postgresql://u:p@localhost/x_test_real",
      /not "x_test_real"/,
    ],
    ["something that is not a URL", "not a url", /not a connection string/],
    [
      "a query naming another host",
      "postgresql://u:p@localhost/app_test?host=db.example.com",
      /query string/,
    ],
    [
      "a query naming another database",
      "postgresql://u:p@localhost/app_test?db=app",
      /query string/,
    ],
    [
      "a malformed escape in the name",
      "postgresql://u:p@localhost/app%E0%A4%A_test",
      /not readable/,
    ],
    ["nothing", undefined, /TEST_DATABASE_URL is not set/],
    ["an empty value", " ", /TEST_DATABASE_URL is not set/],
  ])("refuses %s", (_name, url, reason) => {
    expect(integrationDatabaseRefusal(url)).toMatch(reason);
  });

  it("reads an encoded database name as Postgres would", () => {
    expect(integrationDatabaseRefusal("postgresql://u:p@localhost/my%20db_test")).toBeNull();
  });
});

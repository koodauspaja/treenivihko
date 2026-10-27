import { globSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Set by GitHub Actions (CI), by the workflow (PR_NUMBER, SONAR_TOKEN) or by Railway
// (RAILWAY_GIT_COMMIT_SHA), never in a local .env.
const NOT_LOCAL = new Set(["CI", "PR_NUMBER", "RAILWAY_GIT_COMMIT_SHA", "SONAR_TOKEN"]);

const code = globSync([
  "*.config.ts",
  "src/**/*.{ts,tsx}",
  "scripts/**/*.ts",
  "tests/support/**/*.ts",
]);
const read = new Set([
  ...code.flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(/\benv\.([A-Z][A-Z0-9_]*)/g)].map((match) => match[1])
  ),
  ...[...readFileSync("docker-compose.yml", "utf8").matchAll(/\$\{?([A-Z][A-Z0-9_]*)/g)].map(
    (match) => match[1]
  ),
]);
const required = [...read]
  .filter((name): name is string => !!name && !NOT_LOCAL.has(name))
  .sort((a, b) => a.localeCompare(b));

const entries = readFileSync(".env.example", "utf8")
  .split("\n")
  .filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line))
  .map((line) => {
    const [name = "", ...value] = line.split("=");
    return { name, value: value.join("=") };
  });

describe(".env.example", () => {
  it("finds the variables the code reads", () => {
    expect(required).toEqual([
      "AUTH_ALLOWED_EMAILS",
      "BETTER_AUTH_SECRET",
      "BETTER_AUTH_URL",
      "DATABASE_URL",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "TEST_DATABASE_URL",
      "TREENIVIHKO_POSTGRES_PASSWORD",
    ]);
  });

  it("names every variable the code and Compose read, and no other", () => {
    expect(entries.map((entry) => entry.name).sort((a, b) => a.localeCompare(b))).toEqual(required);
  });

  it.each(entries)("gives $name no real value", ({ value }) => {
    if (!value.includes("://")) {
      expect(value).toBe("");
      return;
    }
    // A URL with no credential holds no secret; one with a credential holds the placeholder.
    const { username, password } = new URL(value);
    if (username !== "" || password !== "") {
      expect(decodeURIComponent(password)).toBe("<password>");
    }
  });
});

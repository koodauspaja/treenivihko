import { globSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Set by GitHub Actions (CI) or as a CI secret (SONAR_TOKEN), never in a local .env.
const CI_ONLY = new Set(["CI", "SONAR_TOKEN"]);

const code = globSync(["*.config.ts", "src/**/*.ts", "scripts/**/*.ts", "tests/support/**/*.ts"]);
const read = new Set([
  ...code.flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(/process\.env\.([A-Z_]+)/g)].map((match) => match[1])
  ),
  ...[...readFileSync("docker-compose.yml", "utf8").matchAll(/\$\{([A-Z_]+)/g)].map(
    (match) => match[1]
  ),
]);
const required = [...read]
  .filter((name): name is string => !!name && !CI_ONLY.has(name))
  .sort((a, b) => a.localeCompare(b));

const entries = readFileSync(".env.example", "utf8")
  .split("\n")
  .filter((line) => /^[A-Z_]+=/.test(line))
  .map((line) => {
    const [name = "", ...value] = line.split("=");
    return { name, value: value.join("=") };
  });

describe(".env.example", () => {
  it("finds the variables the code reads", () => {
    expect(required).toEqual([
      "DATABASE_URL",
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
    expect(decodeURIComponent(new URL(value).password)).toBe("<password>");
  });
});

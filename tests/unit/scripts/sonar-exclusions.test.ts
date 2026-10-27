import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { coverageExclusions, readPropertyList } from "../../../scripts/coverage-plan.ts";

const sonarExclusions = readPropertyList(
  readFileSync("sonar-project.properties", "utf8"),
  "sonar.coverage.exclusions"
);

/** Configuration no unit coverage measures: the root's `*.config.ts`, and Railway's. */
const configs = [
  ...readdirSync(".").filter((file) => /\.config\.(ts|mts|cts)$/.test(file)),
  ...readdirSync(".railway").map((file) => `.railway/${file}`),
];

describe("SonarCloud's coverage exclusions", () => {
  it("include every file excluded from unit coverage", () => {
    expect(sonarExclusions).toEqual(expect.arrayContaining(Object.keys(coverageExclusions)));
  });

  it("include every configuration file, at the root and Railway's, which no unit test runs", () => {
    expect(configs.length).toBeGreaterThan(0);
    expect(sonarExclusions).toEqual(expect.arrayContaining(configs));
  });

  it("name only files that exist", () => {
    expect(sonarExclusions.filter((file) => !existsSync(file))).toEqual([]);
  });

  it("name nothing else", () => {
    const expected = new Set([...Object.keys(coverageExclusions), ...configs]);
    expect(sonarExclusions.filter((file) => !expected.has(file))).toEqual([]);
  });
});

describe("readPropertyList", () => {
  it("splits a key's value on commas and trims each entry", () => {
    expect(readPropertyList("a=1\nkey= x.ts, y.ts ,\nb=2", "key")).toEqual(["x.ts", "y.ts"]);
  });

  it("matches the whole key, not a prefix of a longer one", () => {
    expect(readPropertyList("key.more=x.ts\nkey=y.ts", "key")).toEqual(["y.ts"]);
  });

  it("is empty when the key is missing", () => {
    expect(readPropertyList("# key=x.ts\nother=y.ts", "key")).toEqual([]);
  });
});

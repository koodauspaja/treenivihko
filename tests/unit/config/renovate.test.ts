import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type CustomManager = { managerFilePatterns: string[]; matchStrings: string[] };
type PackageRule = {
  matchPackageNames?: string[];
  matchManagers?: string[];
  matchUpdateTypes?: string[];
  allowedVersions?: string;
  dependencyDashboardApproval?: boolean;
};

const renovate = JSON.parse(readFileSync("renovate.json", "utf8")) as {
  minimumReleaseAge?: string;
  customManagers: CustomManager[];
  packageRules: PackageRule[];
};
const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

/** Renovate writes a file pattern as `/regex/`. */
const fromSlashes = (pattern: string) => new RegExp(pattern.slice(1, -1));

describe("Renovate's manager for the npm version CI installs", () => {
  const [manager] = renovate.customManagers;

  it("applies to the CI workflow", () => {
    expect(
      manager?.managerFilePatterns
        .map(fromSlashes)
        .some((re) => re.test(".github/workflows/ci.yml"))
    ).toBe(true);
  });

  it("matches every npm@<version> in the workflow, and nothing else in it", () => {
    const pattern = new RegExp(manager?.matchStrings[0] ?? "(?!)", "g");
    const matched = [...workflow.matchAll(pattern)].map((match) => match.groups?.currentValue);
    const written = [...workflow.matchAll(/npm@(\S+)/g)].map((match) => match[1]);
    expect(matched.length).toBeGreaterThan(0);
    expect(matched).toEqual(written);
  });
});

describe("Renovate's version holds", () => {
  const hold = (name: string) =>
    renovate.packageRules.find((rule) => rule.matchPackageNames?.includes(name))?.allowedVersions;

  it("keeps TypeScript below 7", () => {
    expect(hold("typescript")).toBe("<7");
  });

  it("keeps Node's types on the line .nvmrc names", () => {
    const major = Number(readFileSync(".nvmrc", "utf8").trim().split(".")[0]);
    expect(hold("@types/node")).toBe(`<${major + 1}`);
  });
});

describe("Renovate's guards", () => {
  it("proposes no release younger than two weeks", () => {
    expect(renovate.minimumReleaseAge).toBe("14 days");
  });

  it("asks before moving .nvmrc to a new Node major, which the @types/node hold must follow", () => {
    const rule = renovate.packageRules.find((r) => r.matchManagers?.includes("nvm"));
    expect(rule).toMatchObject({ matchUpdateTypes: ["major"], dependencyDashboardApproval: true });
  });
});

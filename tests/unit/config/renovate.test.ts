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
  minimumReleaseAgeBehaviour?: string;
  customManagers: CustomManager[];
  packageRules: PackageRule[];
};
const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
const railway = readFileSync(".railway/railway.ts", "utf8");
const npmPinned = { ".github/workflows/ci.yml": workflow, ".railway/railway.ts": railway };

const regexFromSlashedPattern = (pattern: string) => new RegExp(pattern.slice(1, -1));

describe("Renovate's manager for the npm version CI and Railway install", () => {
  const [manager] = renovate.customManagers;

  it.each(Object.keys(npmPinned))("applies to %s", (file) => {
    expect(
      manager?.managerFilePatterns.map(regexFromSlashedPattern).some((re) => re.test(file))
    ).toBe(true);
  });

  it.each(Object.entries(npmPinned))(
    "matches every npm@<version> in %s, and nothing else in it",
    (_file, text) => {
      const pattern = new RegExp(manager?.matchStrings[0] ?? "(?!)", "g");
      const matched = [...text.matchAll(pattern)].map((match) => match.groups?.currentValue);
      const written = [...text.matchAll(/npm@(\S+)/g)].map((match) => match[1]);
      expect(matched.length).toBeGreaterThan(0);
      expect(matched).toEqual(written);
    }
  );

  it("has CI and Railway install the same npm", () => {
    const versions = (text: string) => [...new Set(text.match(/npm@\S+/g))];
    expect(versions(railway)).toEqual(versions(workflow));
  });
});

describe("Renovate's version holds", () => {
  /** A package's hold, from a rule that applies to npm dependencies. */
  const hold = (name: string) =>
    renovate.packageRules.find(
      (rule) =>
        rule.matchPackageNames?.includes(name) &&
        (rule.matchManagers === undefined || rule.matchManagers.includes("npm"))
    )?.allowedVersions;

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
    const rule = renovate.packageRules.find(
      (r) => r.matchManagers?.includes("nvm") && r.dependencyDashboardApproval
    );
    expect(rule).toMatchObject({ matchUpdateTypes: ["major"], dependencyDashboardApproval: true });
  });

  it.each([
    ["24.16.0", true],
    ["26.0.0", true],
    ["28.1.2", true],
    ["25.0.0", false],
    ["27.3.0", false],
  ])("proposes Node %s for .nvmrc: %s", (version, allowed) => {
    const rule = renovate.packageRules.find(
      (r) => r.matchManagers?.includes("nvm") && r.allowedVersions
    );
    expect(regexFromSlashedPattern(rule?.allowedVersions ?? "/(?!)/").test(version)).toBe(allowed);
  });

  it("asks before every GitHub Actions update", () => {
    const rule = renovate.packageRules.find((r) => r.matchManagers?.includes("github-actions"));
    expect(rule?.dependencyDashboardApproval).toBe(true);
  });

  it("holds back a release with no timestamp, rather than taking it as old enough", () => {
    expect(renovate.minimumReleaseAgeBehaviour).toBe("timestamp-required");
  });
});

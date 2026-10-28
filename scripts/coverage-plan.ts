/**
 * Which files unit coverage must account for, which are excluded and why, and
 * which source files a coverage report missed.
 *
 * decisions/012-project-init.md
 */

import path from "node:path";

/** Where source lives. Everything matching is measured unless excluded below. */
export const coverageInclude = ["src/**/*.{ts,tsx,mts,cts}", "scripts/**/*.{ts,mts,cts}"];

/**
 * Files no unit test can usefully run, each with its reason. Files only, never
 * a directory, so a tested file beside an excluded one is still measured.
 */
export const coverageExclusions: Readonly<Record<string, string>> = {
  "scripts/coverage-gaps.ts":
    "Reads the report from disk and sets the exit code; what it decides is in coverage-plan.ts, which is tested.",
  "scripts/sonar-gate.ts":
    "Calls SonarCloud's API and sets the exit code; what it decides is in sonar-plan.ts, which is tested.",
  "scripts/generate-migration.ts":
    "Spawns drizzle-kit and sets the exit code; what it decides is in migration-name.ts, which is tested.",
  "scripts/migrate.ts":
    "Connects to the database and sets the exit code; what it does is runMigrations, which is tested, and the integration tests run it against Postgres.",
  "src/lib/exercises/store.ts":
    "Every statement is a query whose point is what Postgres does with it, such as the name's unique index deciding between two saves; tests/integration/exercises.test.ts runs each against Postgres.",
  "src/lib/periods/store.ts":
    "Every statement is a query whose point is what Postgres does with it, such as the exclusion deciding an overlap and the locks keeping positions and limits; tests/integration/periods.test.ts runs each against Postgres.",
  "src/lib/marks/store.ts":
    "Every statement is a query whose point is what Postgres does with it, such as the unique key deciding two first saves and the locks holding a session and its picks; tests/integration/marks.test.ts runs each against Postgres.",
  "src/lib/progress/store.ts":
    "Every statement is a query whose point is what Postgres does with it, such as reading a period's sessions and their marks in one snapshot; tests/integration/progress.test.ts runs each against Postgres.",
  "src/lib/trainer/store.ts":
    "Every statement is a query whose point is what Postgres does with it, such as the lockout's single statement and the races around it; tests/integration/trainer.test.ts runs each against Postgres, which a mock could not stand in for.",
  "scripts/set-trainer-password.ts":
    "Reads standard input, writes through setTrainerPassword and sets the exit code; what it decides is in trainer-password-plan.ts, and the write is in store.ts, both tested.",
  "scripts/migration-history.ts":
    "Reads two commits' migrations through git, and sets the exit code; what it decides is in migration-history-plan.ts, which is tested.",
};

const sourceFile = /^(src\/.+\.(ts|tsx|mts|cts)|scripts\/.+\.(ts|mts|cts))$/;

/** Whether a repository-relative path, with `/` separators, is source coverage must account for. */
export function isSource(path: string): boolean {
  return sourceFile.test(path) && !/\.d\.[mc]?ts$/.test(path);
}

/** `file` relative to `root`, with `/` separators whatever the platform's are. */
export function toRepoPath(
  root: string,
  file: string,
  paths: Pick<typeof path, "relative" | "sep"> = path
): string {
  return paths.relative(root, file).split(paths.sep).join("/");
}

export type CoverageGaps = {
  /** Source files absent from the report: no test imports them. */
  missing: string[];
  /** Exclusions naming a file that does not exist. */
  staleExclusions: string[];
};

/** Compares the source tree with what a coverage report saw. */
export function findCoverageGaps(
  files: readonly string[],
  reported: readonly string[],
  exclusions: Readonly<Record<string, string>> = coverageExclusions
): CoverageGaps {
  const seen = new Set(reported);
  const existing = new Set(files);
  return {
    missing: files.filter((file) => isSource(file) && !seen.has(file) && !(file in exclusions)),
    staleExclusions: Object.keys(exclusions).filter((file) => !existing.has(file)),
  };
}

/**
 * The comma-separated values of `key` in a Java properties file, such as
 * `sonar-project.properties`. A missing key is an empty list.
 */
export function readPropertyList(properties: string, key: string): string[] {
  const line = properties
    .split("\n")
    .map((row) => row.trim())
    .find((row) => row.startsWith(`${key}=`));
  if (line === undefined) {
    return [];
  }
  return line
    .slice(key.length + 1)
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

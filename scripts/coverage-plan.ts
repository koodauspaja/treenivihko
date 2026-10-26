/**
 * Which files unit coverage must account for, which are excluded and why, and
 * which source files a coverage report missed.
 *
 * decisions/012-project-init.md
 */

import path from "node:path";

/** Where source lives. Everything matching is measured unless excluded below. */
export const coverageInclude = ["src/**/*.{ts,tsx,mts}", "scripts/**/*.{ts,mts}"];

/**
 * Files no unit test can usefully run, each with its reason. Files only, never
 * a directory, so a tested file beside an excluded one is still measured.
 */
export const coverageExclusions: Readonly<Record<string, string>> = {
  "scripts/coverage-gaps.ts":
    "Reads the report from disk and sets the exit code; what it decides is in coverage-plan.ts, which is tested.",
};

const sourceFile = /^(src\/.+\.(ts|tsx|mts)|scripts\/.+\.(ts|mts))$/;

/** Whether a repository-relative path, with `/` separators, is source coverage must account for. */
export function isSource(path: string): boolean {
  return sourceFile.test(path) && !/\.d\.m?ts$/.test(path);
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

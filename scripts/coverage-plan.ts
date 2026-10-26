/**
 * Which files unit coverage must account for, which are excluded and why, and
 * which source files a coverage report missed.
 *
 * decisions/012-project-init.md
 */

/** Where source lives. Everything matching is measured unless excluded below. */
export const coverageInclude = ["src/**/*.{ts,tsx}", "scripts/**/*.ts"];

/**
 * Files no unit test can usefully run, each with its reason. Files only, never
 * a directory, so a tested file beside an excluded one is still measured.
 */
export const coverageExclusions: Readonly<Record<string, string>> = {
  "scripts/coverage-gaps.ts":
    "Reads the report from disk and sets the exit code; what it decides is in coverage-plan.ts, which is tested.",
};

const sourceFile = /^(src\/.+\.tsx?|scripts\/.+\.ts)$/;

/** Whether a repository-relative path is source that coverage must account for. */
export function isSource(path: string): boolean {
  return sourceFile.test(path) && !path.endsWith(".d.ts");
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

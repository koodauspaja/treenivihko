/**
 * What SonarCloud must report for a pull request or for `main` to pass, and
 * whether an answer from its measures API does. Stricter than the free plan's
 * built-in quality gate, which cannot be changed.
 *
 * decisions/016-ci-and-sonarcloud.md
 */

export type SonarScope = { pullRequest: string } | { branch: string };

/**
 * A pull request adds no issue, no duplicated line and no security hotspot.
 * Duplication is counted in lines, not as a density, which Sonar rounds to 0.0.
 */
export const pullRequestLimits: Readonly<Record<string, number>> = {
  new_violations: 0,
  new_duplicated_lines: 0,
  new_security_hotspots: 0,
};

/** `main` has no open issue and no hotspot at all, including those a new Sonar rule finds on old lines. */
export const branchLimits: Readonly<Record<string, number>> = {
  violations: 0,
  security_hotspots: 0,
};

/** Metrics Sonar leaves out of its answer when there is nothing to measure. */
const absentWhenNothingNew = new Set(["new_duplicated_lines"]);

/** The limits for a scope: a pull request is judged on its new code, `main` on all of it. */
export function limitsFor(scope: SonarScope): Readonly<Record<string, number>> {
  return "pullRequest" in scope ? pullRequestLimits : branchLimits;
}

/** The measures API's address for these limits and this scope. */
export function measuresUrl(host: string, projectKey: string, scope: SonarScope): string {
  const metrics = [...Object.keys(limitsFor(scope)), "new_lines"];
  const query = new URLSearchParams({ component: projectKey, metricKeys: metrics.join(",") });
  if ("pullRequest" in scope) {
    query.set("pullRequest", scope.pullRequest);
  } else {
    query.set("branch", scope.branch);
  }
  return `${host}/api/measures/component?${query.toString()}`;
}

export type GateResult = { passed: boolean; lines: string[] };

/**
 * One entry of the measures API's answer. An overall metric carries `value`;
 * a new-code metric carries `periods`, one per new-code period, and Sonar
 * Cloud has only the first.
 */
type Measure = { metric?: unknown; value?: unknown; periods?: unknown };

/** The numeric value of each measure in an API answer, by metric; anything unreadable is left out. */
function readMeasures(answer: unknown): Map<string, number> {
  const values = new Map<string, number>();
  const measures = (answer as { component?: { measures?: unknown } })?.component?.measures;
  if (!Array.isArray(measures)) {
    return values;
  }
  for (const measure of measures as Measure[]) {
    const periods = Array.isArray(measure.periods) ? measure.periods : [];
    const raw = measure.value ?? (periods[0] as { value?: unknown } | undefined)?.value;
    const value = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : Number.NaN;
    if (typeof measure.metric === "string" && Number.isFinite(value)) {
      values.set(measure.metric, value);
    }
  }
  return values;
}

/**
 * Judges an answer from the measures API against the limits. A metric that is
 * missing or unreadable fails, except a duplicated-line count Sonar leaves out
 * when it has measured the change's new lines and found none.
 */
export function judgeMeasures(
  limits: Readonly<Record<string, number>>,
  answer: unknown
): GateResult {
  const values = readMeasures(answer);
  const nothingNew = values.get("new_lines") === 0;
  const lines: string[] = [];
  let passed = true;
  for (const [metric, limit] of Object.entries(limits)) {
    const value = values.get(metric);
    if (value === undefined) {
      if (absentWhenNothingNew.has(metric) && nothingNew) {
        lines.push(`${metric}: not measured, no new lines`);
        continue;
      }
      passed = false;
      lines.push(`${metric}: missing from SonarCloud's answer`);
    } else if (value > limit) {
      passed = false;
      lines.push(`${metric}: ${value}, over the limit of ${limit}`);
    } else {
      lines.push(`${metric}: ${value}`);
    }
  }
  return { passed, lines };
}

/** Which scope a CI run is judging, from the pull request number it was given, if any. */
export function scopeFromEnvironment(
  env: Readonly<Record<string, string | undefined>>
): SonarScope {
  const pullRequest = env.PR_NUMBER?.trim();
  return pullRequest ? { pullRequest } : { branch: "main" };
}

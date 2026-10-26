/**
 * Fails the SonarCloud job unless SonarCloud's measures for this pull request,
 * or for `main`, are within the limits in sonar-plan.ts.
 *
 * decisions/016-ci-and-sonarcloud.md
 */

import { readFileSync } from "node:fs";
import { readPropertyList } from "./coverage-plan.ts";
import { judgeMeasures, limitsFor, measuresUrl, scopeFromEnvironment } from "./sonar-plan.ts";

const token = process.env.SONAR_TOKEN;
const [projectKey] = readPropertyList(
  readFileSync("sonar-project.properties", "utf8"),
  "sonar.projectKey"
);
if (!token || !projectKey) {
  process.stderr.write("sonar-gate: SONAR_TOKEN and sonar.projectKey are both needed\n");
  process.exit(1);
}

const scope = scopeFromEnvironment(process.env);
const response = await fetch(measuresUrl("https://sonarcloud.io", projectKey, scope), {
  headers: { Authorization: `Bearer ${token}` },
});
if (!response.ok) {
  process.stderr.write(`sonar-gate: SonarCloud answered ${response.status}\n`);
  process.exit(1);
}

const result = judgeMeasures(limitsFor(scope), await response.json());
for (const line of result.lines) {
  process.stdout.write(`sonar-gate: ${line}\n`);
}
process.exitCode = result.passed ? 0 : 1;

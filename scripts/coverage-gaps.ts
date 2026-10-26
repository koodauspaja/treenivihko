/**
 * Fails when a source file is absent from the unit coverage report, or when a
 * coverage exclusion names a file that no longer exists.
 *
 * decisions/012-project-init.md
 */

import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { findCoverageGaps } from "./coverage-plan.ts";

const root = process.cwd();
const report = JSON.parse(
  readFileSync(resolve(root, "coverage/coverage-final.json"), "utf8")
) as Record<string, unknown>;

const reported = Object.keys(report).map((file) => relative(root, file));
const files = ["src", "scripts"].flatMap((dir) =>
  readdirSync(resolve(root, dir), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(root, resolve(entry.parentPath, entry.name)))
);

const { missing, staleExclusions } = findCoverageGaps(files, reported);

for (const file of missing) {
  process.stderr.write(`coverage-gaps: ${file} is not imported by any unit test\n`);
}
for (const file of staleExclusions) {
  process.stderr.write(
    `coverage-gaps: the exclusion for ${file} names a file that does not exist\n`
  );
}
if (missing.length > 0 || staleExclusions.length > 0) {
  process.exitCode = 1;
}

/**
 * `npm run db:check-history -- <ref>`: fails when this branch changes a
 * migration that `<ref>` (default `origin/main`) already has.
 *
 * decisions/025-migration-history.md
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { MIGRATIONS_FOLDER } from "../src/lib/db/migrations.ts";
import { checkMigrationHistory, type MigrationFiles } from "./migration-history-plan.ts";

const ref = process.argv[2] ?? "origin/main";

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" });

/** The migrations folder at `ref`, read through git. */
function atRef(): MigrationFiles {
  const listed = git("ls-tree", "-r", "--name-only", ref, "--", MIGRATIONS_FOLDER)
    .split("\n")
    .filter((line) => line !== "");
  return new Map(
    listed.map((file) => [
      path.posix.relative(MIGRATIONS_FOLDER, file),
      git("show", `${ref}:${file}`),
    ])
  );
}

/** The migrations folder as it is in the working tree. */
function here(): MigrationFiles {
  if (!existsSync(MIGRATIONS_FOLDER)) {
    return new Map();
  }
  return new Map(
    readdirSync(MIGRATIONS_FOLDER, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const file = path.join(entry.parentPath, entry.name);
        const relative = path.relative(MIGRATIONS_FOLDER, file).split(path.sep).join("/");
        return [relative, readFileSync(file, "utf8")] as const;
      })
  );
}

const result = checkMigrationHistory(atRef(), here());
if (result.ok) {
  process.stdout.write(`Migration history: ${result.message}.\n`);
} else {
  process.stderr.write(
    `Migration history, against ${ref}:\n${result.problems.map((p) => `- ${p}`).join("\n")}\n`
  );
  process.exitCode = 1;
}

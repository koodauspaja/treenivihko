/**
 * `npm run db:check-history`: fails when the commit checked out changes a
 * migration that `origin/main` already has. Both sides are read through git,
 * so line endings and uncommitted edits cannot make them differ.
 *
 * decisions/025-migration-history.md
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import { MIGRATIONS_FOLDER } from "../src/lib/db/migrations.ts";
import { checkMigrationHistory, type MigrationFiles } from "./migration-history-plan.ts";

const MAIN = "origin/main";

// An absolute path, so a directory earlier on PATH cannot stand in for git.
const git = (...args: string[]) => execFileSync("/usr/bin/git", args, { encoding: "utf8" });

/** The migrations folder at a commit, by path relative to the folder. */
function filesAt(commit: string): MigrationFiles {
  const listed = git("ls-tree", "-r", "--name-only", commit, "--", MIGRATIONS_FOLDER)
    .split("\n")
    .filter((line) => line !== "");
  return new Map(
    listed.map((file) => [
      path.posix.relative(MIGRATIONS_FOLDER, file),
      git("show", `${commit}:${file}`),
    ])
  );
}

const result = checkMigrationHistory(filesAt(MAIN), filesAt("HEAD"));
if (result.ok) {
  process.stdout.write(`Migration history: ${result.message}.\n`);
} else {
  const lines = result.problems.map((problem) => "- " + problem);
  process.stderr.write(["Migration history, against " + MAIN + ":", ...lines, ""].join("\n"));
  process.exitCode = 1;
}

/**
 * `npm run db:generate -- --name=<verb>_<what>`: drizzle-kit's generate,
 * refused without a usable name.
 *
 * decisions/023-database.md
 */

import { spawnSync } from "node:child_process";
import { planMigrationGeneration } from "./migration-name.ts";

const plan = planMigrationGeneration(process.argv.slice(2));
if (!plan.ok) {
  process.stderr.write(`${plan.message}\n`);
  process.exit(1);
}
const result = spawnSync(
  process.execPath,
  ["node_modules/drizzle-kit/bin.cjs", "generate", ...plan.forwarded],
  { stdio: "inherit" }
);
process.exit(result.status ?? 1);

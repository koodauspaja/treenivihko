/**
 * What a migration may be called: the generator refuses a badly named one, and
 * a unit test refuses to let one exist.
 *
 * decisions/023-database.md
 */

/** The verbs a migration's name starts with. */
export const MIGRATION_VERBS = ["add", "create", "alter", "drop", "rename", "backfill"] as const;

/** `<verb>_<what>`, the name without drizzle-kit's `NNNN_` prefix. */
export const MIGRATION_NAME = new RegExp(`^(${MIGRATION_VERBS.join("|")})_[a-z0-9_]+$`);

/** The same rule on a full tag, as the journal and the files carry it. */
export const MIGRATION_TAG = new RegExp(
  String.raw`^\d{4}_(${MIGRATION_VERBS.join("|")})_[a-z0-9_]+$`
);

const rule = `A migration name is <verb>_<what>, where <verb> is one of: ${MIGRATION_VERBS.join(", ")}.
Example: npm run db:generate -- --name=create_exercises`;

export type GenerationPlan = { ok: true; forwarded: string[] } | { ok: false; message: string };

/** Every `--name` on the command line, as `--name=x` or `--name x`; a flag is not a value. */
function names(argv: readonly string[]): (string | null)[] {
  const found: (string | null)[] = [];
  for (const [index, argument] of argv.entries()) {
    if (argument.startsWith("--name=")) {
      found.push(argument.slice("--name=".length));
    } else if (argument === "--name") {
      const next = argv[index + 1];
      found.push(next === undefined || next.startsWith("-") ? null : next);
    }
  }
  return found;
}

/** Whether a `db:generate` run may go ahead, forwarding every argument it was given. */
export function planMigrationGeneration(argv: readonly string[]): GenerationPlan {
  const given = names(argv);
  if (given.length === 0) {
    return { ok: false, message: `Missing --name.\n\n${rule}` };
  }
  if (given.length > 1) {
    return { ok: false, message: `--name given ${given.length} times. Give it once.` };
  }
  const [name] = given;
  if (name === null || name === undefined) {
    return { ok: false, message: `--name was given no value.\n\n${rule}` };
  }
  if (!MIGRATION_NAME.test(name)) {
    return { ok: false, message: `"${name}" is not a usable migration name.\n\n${rule}` };
  }
  return { ok: true, forwarded: [...argv] };
}

/**
 * `npm run trainer:set-password`: sets or replaces the trainer side's password,
 * read twice from standard input and never from an argument, and ends every
 * open unlock. Run on Railway through `railway ssh` (setup 011).
 *
 * decisions/f001-trainer-side.md
 */

import { existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { closeDatabase, getDatabase } from "../src/lib/db/index.ts";
import { user } from "../src/lib/db/schema.ts";
import { setTrainerPassword } from "../src/lib/trainer/store.ts";
import { planPasswordChange } from "./trainer-password-plan.ts";

if (process.env.DATABASE_URL === undefined && existsSync(".env")) {
  process.loadEnvFile(".env");
}

// Typed at a terminal, the password is not echoed; piped in, there is nothing to echo.
let muted = false;
const echo = new Writable({
  write(chunk, _encoding, done) {
    if (!muted) {
      process.stderr.write(chunk);
    }
    done();
  },
});
const input = createInterface({
  input: process.stdin,
  output: echo,
  terminal: process.stdin.isTTY,
});
const lines = input[Symbol.asyncIterator]();

async function ask(prompt: string): Promise<string> {
  process.stderr.write(prompt);
  muted = true;
  const line = await lines.next();
  muted = false;
  process.stderr.write("\n");
  return line.done ? "" : line.value;
}

try {
  const password = await ask("New trainer password: ");
  const repeated = await ask("The same again: ");
  const users = await getDatabase().select({ id: user.id }).from(user);
  const plan = planPasswordChange(
    users.map((row) => row.id),
    password,
    repeated
  );
  if (plan.ok) {
    const ended = await setTrainerPassword(plan.userId, password);
    process.stdout.write(`Trainer password set; ${ended} open unlocks ended.\n`);
  } else {
    process.stderr.write(`Not set: ${plan.refusal}.\n`);
    process.exitCode = 1;
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  input.close();
  await closeDatabase();
}

/**
 * Where drizzle-kit finds the schema and writes migrations.
 *
 * decisions/023-database.md
 */

import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

if (process.env.DATABASE_URL === undefined && existsSync(".env")) {
  process.loadEnvFile(".env");
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});

/**
 * The database's connection string, required when the database is first used
 * rather than when a module is imported.
 *
 * decisions/023-database.md
 */
export function requireDatabaseUrl(
  env: Readonly<Record<string, string | undefined>> = process.env
): string {
  const url = env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set: copy .env.example to .env and fill it in");
  }
  return url;
}

import { integrationDatabaseRefusal } from "../../scripts/test-database.ts";

/**
 * Refuses the run before any test loads, from TEST_DATABASE_URL, since the
 * project's env does not reach globalSetup; prints the reason, which Vitest
 * would lose from a thrown error. decisions/023-database.md
 */
export default function guardIntegrationDatabase(): void {
  const refusal = integrationDatabaseRefusal(process.env.TEST_DATABASE_URL);
  if (refusal !== null) {
    process.stderr.write(`integration tests refused: ${refusal}\n`);
    process.exit(1);
  }
}

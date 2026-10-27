import { integrationDatabaseRefusal } from "../../scripts/test-database.ts";

/**
 * The integration project's globalSetup: refuses the whole run before any test
 * file loads. It reads TEST_DATABASE_URL, which the project hands its tests as
 * DATABASE_URL; the project's env does not reach globalSetup. It prints the
 * reason and exits, since Vitest loses a thrown error's message here.
 */
export default function guardIntegrationDatabase(): void {
  const refusal = integrationDatabaseRefusal(process.env.TEST_DATABASE_URL);
  if (refusal !== null) {
    process.stderr.write(`integration tests refused: ${refusal}\n`);
    process.exit(1);
  }
}

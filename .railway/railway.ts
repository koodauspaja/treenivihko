/**
 * The whole Railway project, as Infrastructure as Code: Postgres, the web
 * service, its variables and settings. Railway reads it only when it is
 * applied, and an apply deletes whatever the project holds that this file does
 * not declare, Postgres and its data included.
 *
 * decisions/023-database.md
 * decisions/026-railway.md
 */
import { defineRailway, github, postgres, project, service } from "railway/iac";

// Railway's stored name for europe-west4. With the short name, every later plan
// shows a move, which the CLI counts as destructive.
export const REGION = "europe-west4-drams3a";

/**
 * Railpack's install step. Node 24 ships an older npm than .npmrc's engine-strict
 * accepts, so npm 12 runs the install through npx; a global install lands off
 * Railpack's path. Install scripts are skipped, as in CI.
 */
export const NPM_INSTALL = "npx --yes npm@12.2.1 ci --ignore-scripts";

/** What redeploys the site: application code and its build configuration, nothing else. */
export const WATCH_PATTERNS = [
  "src/**",
  "public/**",
  "drizzle/**",
  "scripts/migrate.ts",
  "package.json",
  "package-lock.json",
  ".nvmrc",
  ".npmrc",
  "next.config.ts",
  "tsconfig.json",
];

export default defineRailway(() => {
  const database = postgres("Postgres", { region: REGION });

  const web = service("treenivihko", {
    // A red CI run on main leaves the previous version serving.
    source: github("koodauspaja/treenivihko", { branch: "main", checkSuites: true }),
    env: { DATABASE_URL: database.env.DATABASE_URL, RAILPACK_NODE_NPM_INSTALL: NPM_INSTALL },
    replicas: { [REGION]: 1 },
    build: { watchPatterns: WATCH_PATTERNS },
    deploy: {
      // The one place migrations run, in the new container before it takes traffic.
      preDeployCommand: ["npm run db:migrate"],
      // Not `npm start`: npm runs its script through `sh -c`, and that shell dies on
      // Railway's SIGTERM while the server never receives it.
      startCommand: "node node_modules/next/dist/bin/next start",
      healthcheckPath: "/api/health",
      healthcheckTimeout: 60,
      // "On failure" is Railway's default, stored as null, so only the retries are declared.
      restartPolicyMaxRetries: 3,
      // Used a few times a week: it stops when idle and wakes on the next request.
      sleepApplication: true,
    },
  });

  return project("treenivihko", { resources: [database, web] });
});

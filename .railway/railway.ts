/**
 * The whole Railway project, as Infrastructure as Code: Postgres, the web
 * service, the nightly backup and its bucket, their variables and settings.
 * Railway reads it only when it is applied, and an apply deletes whatever the
 * project holds that this file does not declare, Postgres and its data, and
 * the bucket and its backups, included.
 *
 * decisions/023-database.md
 * decisions/026-railway.md
 * decisions/029-sign-in.md
 * decisions/f001-trainer-side.md
 * decisions/063-database-backups.md
 */
import {
  bucket,
  defineRailway,
  github,
  postgres,
  preserve,
  project,
  ref,
  service,
} from "railway/iac";

// Railway's stored name for europe-west4. With the short name, every later plan
// shows a move, which the CLI counts as destructive.
export const REGION = "europe-west4-drams3a";

/**
 * Railpack's install step. Node 24 ships an older npm than .npmrc's engine-strict
 * accepts, so npm 12 runs the install through npx; a global install lands off
 * Railpack's path. Install scripts are skipped, as in CI.
 */
export const NPM_INSTALL = "npx --yes npm@12.2.1 ci --ignore-scripts";

/**
 * What redeploys the site: application code, the scripts run on the service
 * (migrations, and the trainer password), and
 * the build's configuration, nothing else.
 */
export const WATCH_PATTERNS = [
  "src/**",
  "public/**",
  "drizzle/**",
  "scripts/migrate.ts",
  "scripts/set-trainer-password.ts",
  "scripts/trainer-password-plan.ts",
  "package.json",
  "package-lock.json",
  ".nvmrc",
  ".npmrc",
  "next.config.ts",
  "tsconfig.json",
];

/** 01:00 UTC, three or four in the morning in Finland, when nothing writes. */
export const BACKUP_SCHEDULE = "0 1 * * *";

/** The backup image's own files; nothing else rebuilds it. */
export const BACKUP_WATCH_PATTERNS = ["docker/backup/**"];

export default defineRailway(() => {
  const database = postgres("Postgres", { region: REGION });

  // Amsterdam, the bucket region nearest to the database's.
  const backups = bucket("backups", { region: "ams" });

  const backup = service("backup", {
    source: github("koodauspaja/treenivihko", { branch: "main", checkSuites: true }),
    env: {
      DATABASE_URL: database.env.DATABASE_URL,
      BUCKET: ref(backups, "BUCKET"),
      AWS_ACCESS_KEY_ID: ref(backups, "ACCESS_KEY_ID"),
      AWS_SECRET_ACCESS_KEY: ref(backups, "SECRET_ACCESS_KEY"),
      AWS_DEFAULT_REGION: ref(backups, "REGION"),
      AWS_ENDPOINT_URL: ref(backups, "ENDPOINT"),
    },
    replicas: { [REGION]: 1 },
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "docker/backup/Dockerfile",
      watchPatterns: BACKUP_WATCH_PATTERNS,
    },
    deploy: {
      cronSchedule: BACKUP_SCHEDULE,
      // A failed night shows as failed, and the next night runs as usual.
      restartPolicyType: "NEVER",
    },
  });

  const web = service("treenivihko", {
    // A red CI run on main leaves the previous version serving.
    source: github("koodauspaja/treenivihko", { branch: "main", checkSuites: true }),
    env: {
      DATABASE_URL: database.env.DATABASE_URL,
      RAILPACK_NODE_NPM_INSTALL: NPM_INSTALL,
      // Railway resolves it to the service's own domain.
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Railway's reference syntax, not a JavaScript template.
      BETTER_AUTH_URL: "https://${{RAILWAY_PUBLIC_DOMAIN}}",
      // Set on Railway, never here; an apply keeps what is set.
      BETTER_AUTH_SECRET: preserve(),
      GOOGLE_CLIENT_ID: preserve(),
      GOOGLE_CLIENT_SECRET: preserve(),
      AUTH_ALLOWED_EMAILS: preserve(),
    },
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

  return project("treenivihko", { resources: [database, web, backups, backup] });
});

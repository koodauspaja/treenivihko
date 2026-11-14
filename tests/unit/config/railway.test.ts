import { existsSync, readFileSync } from "node:fs";
import { createRailwayContext, type DatabaseNode, project, type ResourceNode } from "railway/iac";
import { describe, expect, it } from "vitest";
import program, {
  BACKUP_SCHEDULE,
  BACKUP_WATCH_PATTERNS,
  NPM_INSTALL,
  REGION,
  WATCH_PATTERNS,
} from "../../../.railway/railway";

/**
 * `.railway/railway.ts` as it evaluates. Railway's CLI drops a key it does not
 * know without a word, and an apply deletes what the file stops declaring, so
 * each resource is written out here in full, deliberately, not imported.
 *
 * decisions/026-railway.md
 * decisions/063-database-backups.md
 */

const definition = await program(
  createRailwayContext({ environmentName: "production", projectName: "treenivihko" }),
  project
);
const resources: ResourceNode[] = (definition.resources ?? []).flat();
const named = (name: string) => resources.find((resource) => resource.name === name);

const IN_REGION = { "europe-west4-drams3a": { numReplicas: 1 } };

describe(".railway/railway.ts", () => {
  it("declares the project's Postgres, web service, backup and bucket, and nothing else", () => {
    expect(definition.name).toBe("treenivihko");
    expect(resources.map((resource) => resource.address).sort()).toEqual([
      "bucket.backups",
      "database.Postgres",
      "service.backup",
      "service.treenivihko",
    ]);
  });

  it("keeps Postgres 18 declared, in the region, since an apply deletes an undeclared one", () => {
    expect(named("Postgres")).toEqual({
      address: "database.Postgres",
      type: "database",
      kind: "database",
      engine: "postgres",
      name: "Postgres",
      image: "ghcr.io/railwayapp-templates/postgres-ssl:18",
      output: "DATABASE_URL",
      defaultMountPath: "/var/lib/postgresql/data",
      source: { type: "image", image: "ghcr.io/railwayapp-templates/postgres-ssl:18" },
      deploy: { multiRegionConfig: IN_REGION },
    });
  });

  it("declares the web service exactly: main after CI, migrations first, sleeping when idle", () => {
    expect(named("treenivihko")).toEqual({
      address: "service.treenivihko",
      type: "service",
      kind: "github",
      name: "treenivihko",
      source: {
        type: "github",
        repo: "koodauspaja/treenivihko",
        branch: "main",
        checkSuites: true,
      },
      build: {
        watchPatterns: [
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
        ],
      },
      deploy: {
        preDeployCommand: ["npm run db:migrate"],
        startCommand: "node node_modules/next/dist/bin/next start",
        healthcheckPath: "/api/health",
        healthcheckTimeout: 60,
        // On failure, Railway's default, is left out: it is stored as null.
        restartPolicyMaxRetries: 3,
        sleepApplication: true,
        multiRegionConfig: IN_REGION,
      },
      variables: {
        DATABASE_URL: { type: "reference", resource: "database.Postgres", output: "DATABASE_URL" },
        RAILPACK_NODE_NPM_INSTALL: {
          type: "literal",
          value: "npx --yes npm@12.2.1 ci --ignore-scripts",
        },
        // biome-ignore lint/suspicious/noTemplateCurlyInString: Railway's reference syntax.
        BETTER_AUTH_URL: { type: "literal", value: "https://${{RAILWAY_PUBLIC_DOMAIN}}" },
        // Names only: their values are set on Railway, and an apply keeps them.
        BETTER_AUTH_SECRET: { type: "preserve" },
        GOOGLE_CLIENT_ID: { type: "preserve" },
        GOOGLE_CLIENT_SECRET: { type: "preserve" },
        AUTH_ALLOWED_EMAILS: { type: "preserve" },
      },
    });
  });

  it("keeps the backups' bucket declared, in Amsterdam, since an apply deletes an undeclared one", () => {
    expect(named("backups")).toEqual({
      address: "bucket.backups",
      type: "bucket",
      name: "backups",
      config: { region: "ams" },
    });
  });

  it("declares the backup exactly: its image from main after CI, nightly, never retried", () => {
    const fromBucket = (output: string) => ({
      type: "reference",
      resource: "bucket.backups",
      output,
    });
    expect(named("backup")).toEqual({
      address: "service.backup",
      type: "service",
      kind: "github",
      name: "backup",
      source: {
        type: "github",
        repo: "koodauspaja/treenivihko",
        branch: "main",
        checkSuites: true,
      },
      build: {
        builder: "DOCKERFILE",
        dockerfilePath: "docker/backup/Dockerfile",
        watchPatterns: ["docker/backup/**"],
      },
      deploy: {
        cronSchedule: "0 1 * * *",
        restartPolicyType: "NEVER",
        multiRegionConfig: IN_REGION,
      },
      variables: {
        DATABASE_URL: { type: "reference", resource: "database.Postgres", output: "DATABASE_URL" },
        BUCKET: fromBucket("BUCKET"),
        AWS_ACCESS_KEY_ID: fromBucket("ACCESS_KEY_ID"),
        AWS_SECRET_ACCESS_KEY: fromBucket("SECRET_ACCESS_KEY"),
        AWS_DEFAULT_REGION: fromBucket("REGION"),
        AWS_ENDPOINT_URL: fromBucket("ENDPOINT"),
      },
    });
  });

  it("dumps with a pg_dump no older than Railway's Postgres, which pg_dump refuses", () => {
    const base = readFileSync("docker/backup/Dockerfile", "utf8").match(
      /^FROM postgres:(\d+)-alpine$/m
    );
    const server = (named("Postgres") as DatabaseNode).image.match(/:(\d+)$/);
    expect(Number(base?.[1])).toBeGreaterThanOrEqual(Number(server?.[1]));
  });

  it("ends a backup that runs past its deadline, well before the next night's", () => {
    const entrypoint = readFileSync("docker/backup/Dockerfile", "utf8").match(
      /^ENTRYPOINT \["sh", "\/usr\/local\/lib\/backup\/(.+)"\]$/m
    );
    expect(entrypoint?.[1]).toBe("entrypoint.sh");
    const deadline = readFileSync("docker/backup/entrypoint.sh", "utf8").match(
      /^timeout -k (\d+) (\d+) sh \/usr\/local\/lib\/backup\/backup\.sh$/m
    );
    const seconds = Number(deadline?.[1]) + Number(deadline?.[2]);
    expect(seconds).toBeGreaterThan(0);
    expect(seconds).toBeLessThan(23 * 60 * 60);
  });

  it("exports the values the service uses", () => {
    expect(REGION).toBe("europe-west4-drams3a");
    expect(NPM_INSTALL).toBe("npx --yes npm@12.2.1 ci --ignore-scripts");
    expect(named("treenivihko")).toMatchObject({ build: { watchPatterns: WATCH_PATTERNS } });
    expect(BACKUP_SCHEDULE).toBe("0 1 * * *");
    expect(named("backup")).toMatchObject({ build: { watchPatterns: BACKUP_WATCH_PATTERNS } });
  });

  it.each(WATCH_PATTERNS.filter((pattern) => !pattern.includes("*")))(
    "watches %s, a file that exists",
    (file) => {
      expect(existsSync(file)).toBe(true);
    }
  );

  it("serves the health check path it waits for", () => {
    expect(existsSync("src/app/api/health/route.ts")).toBe(true);
  });

  it.each(["railway.json", "railway.toml"])(
    "has no %s, which the CLI refuses beside this file",
    (file) => {
      expect(existsSync(file)).toBe(false);
    }
  );
});

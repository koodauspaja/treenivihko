import { existsSync } from "node:fs";
import { createRailwayContext, project, type ResourceNode } from "railway/iac";
import { describe, expect, it } from "vitest";
import program, { NPM_INSTALL, REGION, WATCH_PATTERNS } from "../../../.railway/railway";

/**
 * `.railway/railway.ts` as it evaluates. Railway's CLI drops a key it does not
 * know without a word, and an apply deletes what the file stops declaring, so
 * each resource is written out here in full, deliberately, not imported.
 *
 * decisions/026-railway.md
 */

const definition = await program(
  createRailwayContext({ environmentName: "production", projectName: "treenivihko" }),
  project
);
const resources: ResourceNode[] = (definition.resources ?? []).flat();
const named = (name: string) => resources.find((resource) => resource.name === name);

const IN_REGION = { "europe-west4-drams3a": { numReplicas: 1 } };

describe(".railway/railway.ts", () => {
  it("declares the project's Postgres and web service, and nothing else", () => {
    expect(definition.name).toBe("treenivihko");
    expect(resources.map((resource) => resource.address).sort()).toEqual([
      "database.Postgres",
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
          "drizzle/**",
          "scripts/migrate.ts",
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
      },
    });
  });

  it("exports the values the service uses", () => {
    expect(REGION).toBe("europe-west4-drams3a");
    expect(NPM_INSTALL).toBe("npx --yes npm@12.2.1 ci --ignore-scripts");
    expect(named("treenivihko")).toMatchObject({ build: { watchPatterns: WATCH_PATTERNS } });
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

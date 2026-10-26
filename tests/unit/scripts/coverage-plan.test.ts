import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  coverageExclusions,
  findCoverageGaps,
  isSource,
  toRepoPath,
} from "../../../scripts/coverage-plan.ts";

describe("isSource", () => {
  it.each([
    "src/app/page.tsx",
    "src/lib/programs/plan.ts",
    "scripts/coverage-plan.ts",
    "src/lib/a.mts",
    "src/lib/b.cts",
    "scripts/c.cts",
  ])("counts %s as source", (path) => {
    expect(isSource(path)).toBe(true);
  });

  it.each([
    "src/app/globals.css",
    "src/types/env.d.ts",
    "src/types/env.d.mts",
    "src/types/env.d.cts",
    "scripts/data.json",
    "tests/unit/app/page.test.tsx",
    "next.config.ts",
    "srcx/app.ts",
  ])("does not count %s as source", (path) => {
    expect(isSource(path)).toBe(false);
  });
});

describe("findCoverageGaps", () => {
  it("reports a source file the coverage report does not contain", () => {
    const gaps = findCoverageGaps(["src/app/page.tsx", "src/lib/a.ts"], ["src/app/page.tsx"], {});
    expect(gaps).toEqual({ missing: ["src/lib/a.ts"], staleExclusions: [] });
  });

  it("does not report an excluded file", () => {
    const gaps = findCoverageGaps(["scripts/run.ts"], [], { "scripts/run.ts": "reason" });
    expect(gaps).toEqual({ missing: [], staleExclusions: [] });
  });

  it("ignores files that are not source", () => {
    const gaps = findCoverageGaps(["src/app/globals.css", "src/env.d.ts"], [], {});
    expect(gaps.missing).toEqual([]);
  });

  it("reports an exclusion that names a file which does not exist", () => {
    const gaps = findCoverageGaps(["src/app/page.tsx"], ["src/app/page.tsx"], {
      "scripts/gone.ts": "reason",
    });
    expect(gaps).toEqual({ missing: [], staleExclusions: ["scripts/gone.ts"] });
  });

  it("checks against the project's own exclusions by default", () => {
    const gaps = findCoverageGaps([], []);
    expect(gaps.staleExclusions).toEqual(Object.keys(coverageExclusions));
  });
});

describe("coverageExclusions", () => {
  it("gives every exclusion a reason and names a file, never a directory", () => {
    for (const [file, reason] of Object.entries(coverageExclusions)) {
      expect(reason.length).toBeGreaterThan(0);
      expect(isSource(file)).toBe(true);
    }
  });
});

describe("toRepoPath", () => {
  it("gives a path relative to the root", () => {
    expect(toRepoPath("/repo", "/repo/src/app/page.tsx")).toBe("src/app/page.tsx");
  });

  it("uses forward slashes on Windows", () => {
    expect(toRepoPath("C:\\repo", "C:\\repo\\src\\app\\page.tsx", path.win32)).toBe(
      "src/app/page.tsx"
    );
  });
});

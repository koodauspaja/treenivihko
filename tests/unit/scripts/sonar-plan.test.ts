import { describe, expect, it } from "vitest";
import {
  branchLimits,
  judgeMeasures,
  limitsFor,
  measuresUrl,
  pullRequestLimits,
  scopeFromEnvironment,
} from "../../../scripts/sonar-plan.ts";

const answer = (measures: unknown[]) => ({ component: { measures } });

describe("limitsFor", () => {
  it("judges a pull request on its new code", () => {
    expect(limitsFor({ pullRequest: "7" })).toBe(pullRequestLimits);
  });

  it("judges main on all of its code", () => {
    expect(limitsFor({ branch: "main" })).toBe(branchLimits);
  });

  it("allows nothing", () => {
    expect([...Object.values(pullRequestLimits), ...Object.values(branchLimits)]).toEqual([
      0, 0, 0, 0, 0,
    ]);
  });
});

describe("measuresUrl", () => {
  it("asks for a pull request's new-code metrics and its new lines", () => {
    const url = new URL(measuresUrl("https://sonar.test", "org_app", { pullRequest: "7" }));
    expect(url.pathname).toBe("/api/measures/component");
    expect(url.searchParams.get("component")).toBe("org_app");
    expect(url.searchParams.get("pullRequest")).toBe("7");
    expect(url.searchParams.get("branch")).toBeNull();
    expect(url.searchParams.get("metricKeys")?.split(",")).toEqual([
      "new_violations",
      "new_duplicated_lines_density",
      "new_security_hotspots",
      "new_lines",
    ]);
  });

  it("asks for a branch's overall metrics", () => {
    const url = new URL(measuresUrl("https://sonar.test", "org_app", { branch: "main" }));
    expect(url.searchParams.get("branch")).toBe("main");
    expect(url.searchParams.get("pullRequest")).toBeNull();
    expect(url.searchParams.get("metricKeys")?.split(",")).toEqual([
      "violations",
      "security_hotspots",
      "new_lines",
    ]);
  });
});

describe("judgeMeasures", () => {
  it("passes when every metric is at its limit", () => {
    const result = judgeMeasures(
      pullRequestLimits,
      answer([
        { metric: "new_violations", value: "0" },
        { metric: "new_duplicated_lines_density", period: { value: "0.0" } },
        { metric: "new_security_hotspots", value: "0" },
        { metric: "new_lines", value: "12" },
      ])
    );
    expect(result).toEqual({
      passed: true,
      lines: ["new_violations: 0", "new_duplicated_lines_density: 0", "new_security_hotspots: 0"],
    });
  });

  it("fails on the smallest value over its limit, and says so", () => {
    const result = judgeMeasures(
      { new_violations: 0 },
      answer([{ metric: "new_violations", value: "1" }])
    );
    expect(result).toEqual({
      passed: false,
      lines: ["new_violations: 1, over the limit of 0"],
    });
  });

  it("fails on a duplication density just over zero", () => {
    const result = judgeMeasures(
      { new_duplicated_lines_density: 0 },
      answer([{ metric: "new_duplicated_lines_density", value: "0.1" }])
    );
    expect(result.passed).toBe(false);
  });

  it("fails on a metric missing from the answer", () => {
    const result = judgeMeasures({ new_violations: 0 }, answer([]));
    expect(result).toEqual({
      passed: false,
      lines: ["new_violations: missing from SonarCloud's answer"],
    });
  });

  it.each([
    ["an empty string", ""],
    ["a word", "none"],
    ["a number that is not a string", 0],
  ])("fails on a value that is %s", (_name, value) => {
    expect(
      judgeMeasures({ new_violations: 0 }, answer([{ metric: "new_violations", value }])).passed
    ).toBe(false);
  });

  it.each([
    ["null", null],
    ["a measures list that is not a list", { component: { measures: "0" } }],
    ["a measure without a metric name", answer([{ value: "0" }])],
  ])("fails on an answer that is %s", (_name, value) => {
    expect(judgeMeasures({ new_violations: 0 }, value).passed).toBe(false);
  });

  it("passes a missing duplication density when there are no new lines", () => {
    const result = judgeMeasures(
      { new_duplicated_lines_density: 0 },
      answer([{ metric: "new_lines", value: "0" }])
    );
    expect(result).toEqual({
      passed: true,
      lines: ["new_duplicated_lines_density: not measured, no new lines"],
    });
  });

  it("passes a missing duplication density when Sonar measured no new lines at all", () => {
    expect(judgeMeasures({ new_duplicated_lines_density: 0 }, answer([])).passed).toBe(true);
  });

  it("fails a missing duplication density when there are new lines", () => {
    const result = judgeMeasures(
      { new_duplicated_lines_density: 0 },
      answer([{ metric: "new_lines", value: "5" }])
    );
    expect(result.passed).toBe(false);
  });

  it("does not excuse any other missing metric for having no new lines", () => {
    expect(
      judgeMeasures({ new_violations: 0 }, answer([{ metric: "new_lines", value: "0" }])).passed
    ).toBe(false);
  });
});

describe("scopeFromEnvironment", () => {
  it("judges the pull request whose number it is given", () => {
    expect(scopeFromEnvironment({ PR_NUMBER: " 16 " })).toEqual({ pullRequest: "16" });
  });

  it.each([
    ["no number", {}],
    ["an empty number", { PR_NUMBER: "" }],
  ])("judges main when given %s", (_name, env) => {
    expect(scopeFromEnvironment(env)).toEqual({ branch: "main" });
  });
});

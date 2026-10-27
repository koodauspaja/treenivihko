import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  branchLimits,
  judgeMeasures,
  limitsFor,
  measuresUrl,
  pullRequestLimits,
  scopeFromEnvironment,
} from "../../../scripts/sonar-plan.ts";

/** SonarCloud's real answer for a pull request with ten new issues, recorded once. */
const recorded: unknown = JSON.parse(
  readFileSync("tests/fixtures/sonar/pull-request-measures.json", "utf8")
);

/** SonarCloud's real answer for a pull request that changed no analysed file. */
const recordedNoAnalysedLines: unknown = JSON.parse(
  readFileSync("tests/fixtures/sonar/pull-request-no-analysed-lines.json", "utf8")
);

const answer = (measures: unknown[]) => ({ component: { measures } });
/** A new-code measure, in the shape SonarCloud answers with. */
const newCode = (metric: string, value: unknown) => ({ metric, periods: [{ index: 1, value }] });
/** An overall measure, in the shape SonarCloud answers with. */
const overall = (metric: string, value: unknown) => ({ metric, value });

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
      "new_duplicated_lines",
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
  it("reads SonarCloud's recorded answer, and fails it for its ten new issues", () => {
    expect(judgeMeasures(pullRequestLimits, recorded)).toEqual({
      passed: false,
      lines: [
        "new_violations: 10, over the limit of 0",
        "new_duplicated_lines: 0",
        "new_security_hotspots: 0",
      ],
    });
  });

  it("passes a pull request with nothing new", () => {
    const result = judgeMeasures(
      pullRequestLimits,
      answer([
        newCode("new_violations", "0"),
        newCode("new_duplicated_lines", "0"),
        newCode("new_security_hotspots", "0"),
        newCode("new_lines", "12"),
      ])
    );
    expect(result.passed).toBe(true);
  });

  it("passes main with nothing open", () => {
    const result = judgeMeasures(
      branchLimits,
      answer([overall("violations", "0"), overall("security_hotspots", "0")])
    );
    expect(result).toEqual({ passed: true, lines: ["violations: 0", "security_hotspots: 0"] });
  });

  it("fails on the smallest value over its limit, and says so", () => {
    const result = judgeMeasures({ new_violations: 0 }, answer([newCode("new_violations", "1")]));
    expect(result).toEqual({
      passed: false,
      lines: ["new_violations: 1, over the limit of 0"],
    });
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
      judgeMeasures({ new_violations: 0 }, answer([newCode("new_violations", value)])).passed
    ).toBe(false);
  });

  it.each([
    ["null", null],
    ["a measures list that is not a list", { component: { measures: "0" } }],
    ["a measure without a metric name", answer([{ periods: [{ value: "0" }] }])],
    ["a new-code measure with no periods", answer([{ metric: "new_violations", periods: [] }])],
    ["periods that are not a list", answer([{ metric: "new_violations", periods: "0" }])],
  ])("fails on an answer that is %s", (_name, value) => {
    expect(judgeMeasures({ new_violations: 0 }, value).passed).toBe(false);
  });

  it("passes a missing duplicated-line count when Sonar measured no new lines", () => {
    const result = judgeMeasures({ new_duplicated_lines: 0 }, answer([newCode("new_lines", "0")]));
    expect(result).toEqual({
      passed: true,
      lines: ["new_duplicated_lines: not measured, no new lines"],
    });
  });

  it("passes SonarCloud's recorded answer for a pull request that changed no analysed file", () => {
    expect(judgeMeasures(pullRequestLimits, recordedNoAnalysedLines)).toEqual({
      passed: true,
      lines: [
        "new_violations: 0",
        "new_duplicated_lines: not measured, no new lines",
        "new_security_hotspots: 0",
      ],
    });
  });

  it("still fails an empty answer, on the metrics Sonar always sends", () => {
    expect(judgeMeasures(pullRequestLimits, answer([])).passed).toBe(false);
  });

  it("fails a missing duplicated-line count when there are new lines", () => {
    const result = judgeMeasures({ new_duplicated_lines: 0 }, answer([newCode("new_lines", "5")]));
    expect(result.passed).toBe(false);
  });

  it("does not excuse any other missing metric for having no new lines", () => {
    expect(judgeMeasures({ new_violations: 0 }, answer([newCode("new_lines", "0")])).passed).toBe(
      false
    );
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

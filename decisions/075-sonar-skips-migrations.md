# 075 — SonarCloud leaves migrations out of coverage

## Context

Migration 0011 holds a plpgsql function. SonarCloud's SQL analyser counts the
three statements in its body as executable lines, and no unit test can reach
them, so `main` showed 99.9% coverage while unit coverage was 100%. Earlier
migrations were plain DDL, which Sonar does not count.

## Decision

- `drizzle/migrations/**` is in `sonar.coverage.exclusions`. A migration is run
  by the integration tests against Postgres, which is where it is checked.
- It is a pattern, not a file list, so the next migration with a function body
  does not bring the gap back.
- `tests/unit/scripts/sonar-exclusions.test.ts` expects the pattern and skips
  it in its check that listed files exist.

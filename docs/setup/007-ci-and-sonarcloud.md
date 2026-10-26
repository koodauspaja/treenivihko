# 007 — CI and SonarCloud

## Goal

Every pull request to `main`, and every push to it, runs the checks
`npm run verify` runs, and SonarCloud analyses the code with its unit coverage.
All of them must pass before a merge. The workflow and its configuration arrive
with the clone.

This project: SonarCloud organisation `koodauspaja`, project key
`koodauspaja_treenivihko`.

| What | Where |
|---|---|
| The workflow | `.github/workflows/ci.yml` |
| What SonarCloud analyses and leaves out of coverage | `sonar-project.properties` |
| The test that keeps Sonar's coverage exclusions in step with Vitest's | `tests/unit/scripts/sonar-exclusions.test.ts` |

---

## Step 1 — The SonarCloud project

1. <https://sonarcloud.io> → **Log in with GitHub**
2. **+** → **Analyze new project** → your organisation → the repository →
   **Set up**. A public repository is on the free plan.
3. **New code definition**: **Number of days**, 30. There are no versions or
   releases here for "Previous version" to count from. It decides only what
   `main`'s view calls new; a pull request is always judged on its own changes.
4. Choose **With GitHub Actions** as the analysis method, **JS/TS & Web**,
   **Linux**, and leave **Automatic configuration** off: the scope, tests and
   exclusions are in `sonar-project.properties`, where a unit test checks them.
   Do not copy the example files the wizard shows; this repository has its
   own. SonarCloud shows a token; copy it.
5. Project → **Administration** → **Analysis Method** → turn **Automatic
   Analysis** off. With both on, the CI scan fails: SonarCloud refuses a second
   analysis of the same commit.
6. Project → **Administration** → **Quality Profiles**: set **TypeScript**,
   **JavaScript** and **YAML** to **Sonar way comprehensive**, which has more
   rules than the default **Sonar way**.

## Step 2 — The token

Store it as a repository secret. `gh` reads it from the prompt, so it never
lands in the shell's history:

```bash
gh secret set SONAR_TOKEN --repo <your-org>/<your-repo>
```

## Step 3 — Name your project

In `sonar-project.properties`, set `sonar.projectKey` and `sonar.organization`
to yours. They are not secrets.

## Step 4 — Run it

Open a pull request. Three checks run:

| Check | Runs | Fails when |
|---|---|---|
| `Lint, types and unit tests` | `npm run lint`, `npm run typecheck`, `npm run test:unit` | as `npm run verify` would |
| `Build and end-to-end` | `npm run test:e2e`, with Chromium and its system libraries | the build or the smoke test fails |
| `SonarCloud scan` | the analysis, with the unit job's `coverage/lcov.info`, then `scripts/sonar-gate.ts` | SonarCloud's quality gate fails, or the stricter limits below are not met |

**The limits are stricter than SonarCloud's gate.** The free plan has only
the built-in **Sonar way** gate, which allows 80% coverage and 3% duplication
on new code, and it cannot be changed. So after the scan,
`scripts/sonar-gate.ts` reads SonarCloud's measures and fails unless:

| On | Nothing allowed of |
|---|---|
| a pull request | new issues, new duplicated lines, new security hotspots |
| `main` | open issues and security hotspots at all, so a rule Sonar adds later and finds on old lines fails the next push |

Coverage needs no Sonar limit: the unit job already fails below 100%.

A finding is fixed. One that is wrong for this code is ignored in
`sonar-project.properties` for that rule in the named files, with the reason
beside it; a security rule is never ignored by file.

The jobs run only for the actors named in setup 001's `OWNER_USERNAME` and
`COLLABORATOR_USERNAME`, and for Renovate. For anyone else they are skipped,
and the SonarCloud scan, which needs the unit job, is skipped with it.

## Step 5 — Require the checks

A check can be required only once it has reported, so after Step 4's run add
the three to `main`'s ruleset (setup 005) beside `Sourcery review`, each tied
to the GitHub Actions app, id `15368`:

```json
{ "context": "Lint, types and unit tests", "integration_id": 15368 },
{ "context": "Build and end-to-end", "integration_id": 15368 },
{ "context": "SonarCloud scan", "integration_id": 15368 }
```

A job that is renamed stops reporting under its old name and blocks every
merge, so a rename updates the ruleset in the same pull request.

---

## Done when

- [ ] The SonarCloud project exists, with Automatic Analysis off
- [ ] `SONAR_TOKEN` is a repository secret
- [ ] All three checks pass on a pull request
- [ ] `main`'s ruleset requires them, beside `Sourcery review`

## Next

→ `008`, the database, once it is written.

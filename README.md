# Treenivihko

A Finnish-language training app for one young footballer who trains on his own.
A parent sets up a program for a period: football skills, and the physical and
motor skills around them. He copies it into his notebook (*vihko*) and takes it
to the field, where there is no phone and no network. Back home on wifi, he
marks what he did and how it felt, with emojis. The app learns from those marks
and adapts the next period: longer or shorter, easier or harder.

| Who | Uses it for |
|---|---|
| The child | seeing the current program and his progress, and marking sessions done |
| The parent (trainer) | the child's profile and the programs, behind a passcode |

Every user-facing string is Finnish; code, comments and documents are English.

**Status:** being built. The parent signs in with Google and lands on the
child's side, which shows the period to copy into the notebook; `docs/setup/`
is written step by step as the infrastructure is stood up, and features follow
as specs.

```bash
nvm use                # Node 24, from .nvmrc
npm install -g npm@12  # once; .npmrc refuses an older npm
npm ci
npm run test:e2e:browser
cp .env.example .env   # fill it in: docs/setup/009 and 011
npm run db:up          # Postgres, in Docker
npm run dev            # http://localhost:3000
npm run verify         # every check, as CI runs them
```

---

## Planned stack

Next.js App Router, strict TypeScript, Drizzle on Postgres, Better Auth,
Biome, Vitest at 100% unit coverage, Playwright, deployed on Railway. The
next period adapts to the marks by fixed rules in code, choosing and
adjusting exercises from a curated library; it never invents exercises. A
later feature may add the Claude API, under the same rule.

---

## How we work

Work is tracked as issues on a GitHub Project board. Each piece of work,
whether a feature, a chore or a bug fix, passes three points that belong to a
human:

1. **Agreeing the work.** A feature starts as a spec in `specs/`, with its
   scope and acceptance criteria; a chore or a bug starts as an issue. Nothing
   is built until a human says **go** on it.
2. **Authorising the start.** A human moves the card to `Ready`, or says to
   start. Only then is a branch created.
3. **Merging.** The work arrives as a pull request of conventional commits.
   CI runs the linter, the type check, and the unit tests at 100% coverage.
   SonarCloud checks code quality, and Sourcery reviews the change. A human
   merges it.

Implementation is mostly done by Claude Code. Every feature, and every chore
or bug that changes something meaningful, writes a decision record in
`decisions/` saying what was chosen and why. A piece of work's spec, decision
record and branch all carry one number: a feature's own, Feature 001 onwards,
or a chore's or a bug's issue number. The detailed rules are in
[`CLAUDE.md`](CLAUDE.md), and the skills that carry them out are in
[`.claude/skills/`](.claude/skills/).

---

## Documentation

- Standing the infrastructure up from zero: [`docs/setup/README.md`](docs/setup/README.md)

## Licence

[MIT](LICENSE)

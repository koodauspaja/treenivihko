# Setup guides

Standing the infrastructure up **from zero**, for someone who has cloned the
repository into their own organisation. The code arrives with the clone; these
steps create what the code runs on: accounts, apps, secrets, environments and
rules.

- **Names such as `koodauspaja` and `treenivihko` are this project's own.**
  Substitute yours wherever a step shows them.

## The order

Follow the table from top to bottom; each document ends with a **Next**
pointer to the one below it. **The numbers are names, not the order**: other
documents cite them, so they stay as they are even when a step is inserted
between two others.

| Step | File | What it does |
|---|---|---|
| 1 | [001-github-repo-setup.md](001-github-repo-setup.md) | The public repository, and who may run its workflows |
| 2 | [002-github-project-board.md](002-github-project-board.md) | The project board, its columns and workflows, and the kind labels |
| 3 | [003-templates-and-agent-rules.md](003-templates-and-agent-rules.md) | The issue and pull request templates, `CLAUDE.md` and the skills |
| 4 | [004-sourcery-setup.md](004-sourcery-setup.md) | Sourcery and the project's review rules |
| 5 | [005-branch-protection.md](005-branch-protection.md) | The ruleset that protects `main`, and the merge settings |
| 6 | [006-project-init.md](006-project-init.md) | Node, the install, and `npm run verify` |
| 7 | [007-ci-and-sonarcloud.md](007-ci-and-sonarcloud.md) | CI and SonarCloud on every pull request, and their required checks |
| 8 | [008-renovate.md](008-renovate.md) | Dependency updates as pull requests |
| 9 | [009-database.md](009-database.md) | Postgres, Drizzle, named migrations and the integration tests |
| 10 | [010-railway.md](010-railway.md) | The Railway project from `.railway/railway.ts`: Postgres, the web service and its health check |

The steps after these are written as the infrastructure is stood up.

## Keeping these true

A step changes when a new developer would meet something it does not cover.

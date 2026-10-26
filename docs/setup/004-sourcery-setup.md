# 004 — Sourcery

## Goal

Sourcery reviews every pull request against this project's rules.

This project: repository `koodauspaja/treenivihko`, on Sourcery's Open Source
plan.

---

## Step 1 — Install Sourcery

1. <https://sourcery.ai> → **Sign in with GitHub**
2. **Add a repository** → yours. Sourcery installs itself as a GitHub App on it.

## Step 2 — `.sourcery.yaml`

It arrives with the clone and enables only Sourcery's default rules. The
project's own rules live in the dashboard, not in this file.

## Step 3 — Give the repository its own settings

<https://app.sourcery.ai> → **Code reviews** → the repository. Turn **Use
Organization Settings** off; the repository's settings then start as a copy of
the organisation's. Turning it back on discards them, with no undo.

| Setting | This project |
|---|---|
| AI review comments | On |
| Review profile | Balanced, the default |
| Pull request summary | On |
| Review guide | On, with sequence diagrams |
| Tips and commands | On |
| Review draft pull requests | Off, the default |
| Base branches | `^main$` |
| Path filters | `package-lock.json` |
| Language | English |

The path filter keeps the lockfile out of the reviewed diff. Its changes are
large, and on the Open Source plan they would spend the size limits below. A
dependency change still shows in `package.json`, which is reviewed, and the
project installs only from the public npm registry, so a lockfile carries no
credentials.

## Step 4 — Add the review rules

Same page, **Review rules** tab. Add each block below as a rule block: the
path patterns, then the rule text.

**A block's paths must include every file its rule asks about.** Sourcery
judges a rule from the matching files only, and a rule scoped away from its
subject does not fall silent; it guesses. **A rule sees only changed lines**,
so no block audits files a pull request leaves alone.
[`REVIEW_RULES.md`](../../REVIEW_RULES.md) says why each block exists and
why its paths are what they are.

**Block 1**: `**`
```
- No API key, secret, token or credential may be introduced or modified. Clearly marked placeholders are not secrets: .env.example names variables with empty or obviously fake values, and setup docs show example values. Real values come from environment variables.
- No personal data about a real person may be introduced or modified: a name, age, birth date, photo, school, team, club, address or location. The repository is public and the app's user is a child. Test data and examples use invented names. A log line carries ids, never personal data.
```

**Block 2**: `src/**/*.ts,src/**/*.tsx`
```
- Every string a user sees must be Finnish: labels, messages, errors, empty states and alt text.
- An answer from the Claude API reaches a user only after it has been checked against the exercise library: every exercise it names must exist in the library, and every value it adjusts must be within the limits the code defines. Flag code that shows, stores or returns the model's output without that check, and code that lets the model add an exercise to the library.
```

**Block 3**: `specs/**,decisions/**`
```
- When a pull request changes a spec and the decision record that shares its number, the record must faithfully interpret the spec: decisions/042-weekly-program.md and specs/042-weekly-program.md. Flag any drift, for example the spec saying "the last 5 sessions" and the decision record saying "the last 3".
- Decision records are never edited. A chore's or a bug's record has no spec, and a spec corrected later is interpreted by the later issue's decision record, which names the record it overrides. Do not flag either as a missing or drifted counterpart.
```

## Step 5 — Test with a pull request

Open a pull request. Within a few minutes Sourcery posts a review whose body
starts `Hey - I've reviewed your changes` or `Hey - I've found N issues`. This
project's test was the pull request that added this document.

---

## What is easy to misread

The merge gate in `.claude/skills/open-pr/SKILL.md` reads these.

- **A green check is not a review.** When Sourcery skips, its check still goes
  green: its documentation says a rate limit never blocks a merge.
- **A push after the first review gets a quick check**, not a full review. It
  is a review in state `APPROVED` on the new head, the same state as a full
  review that found nothing, but its whole body is `### Sourcery assessment`
  and `**Approved.**`. Only the first line of the body tells the two apart.
  `@sourcery-ai review`, alone in a comment, asks for a full one.
- **A rule never sees the pull request description**, only changed lines in
  files.
- **Sourcery skips for three reasons**, and each has its own remedy:

  | Cause | Remedy |
  |---|---|
  | The per-PR size cap | split the work; waiting never shrinks a diff |
  | The rolling seven-day budget | wait; splitting spends it faster |
  | Five automatic re-reviews on one PR | `@sourcery-ai review` resets the count |

- **The limits depend on the plan.** A public repository starts on Open
  Source:

  | Plan | Per PR | Rolling 7 days |
  |---|---|---|
  | **Open Source** | **150,000** diff characters | **250,000** per developer |
  | Pro | 300,000 | 1,500,000 per seat |

  Source: <https://docs.sourcery.ai/admin/plans/>. A skip message states the
  cap it applied, so check that before assuming the diff was miscounted.

---

## Done when

- [ ] Sourcery is installed on the repository
- [ ] The repository has its own settings, as in Step 3
- [ ] The three blocks are in the dashboard, each with its paths
- [ ] Sourcery posted a full review on a pull request

## Next

→ [005 — Branch protection](005-branch-protection.md)

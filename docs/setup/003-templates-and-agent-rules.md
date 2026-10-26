# 003 — Templates and working agreements

## Goal

Confirm that issues and pull requests start from their templates, and that
Claude Code finds its instructions and skills. Nothing is created here: all of
it arrives with the clone.

| What | Where |
|---|---|
| The pull request template | `.github/PULL_REQUEST_TEMPLATE.md` |
| The issue templates: feature, chore and bug | `.github/ISSUE_TEMPLATE/` |
| The rules and the workflow | `CLAUDE.md` |
| The skills `write-spec`, `start-work` and `open-pr` | `.claude/skills/` |

---

## Step 1 — The issue templates

Repository → **Issues** → **New issue**. It offers Feature, Chore and Bug, and
no blank issue: `config.yml` turns that off, so every issue starts with a kind.

Each template sets its label and Issue Type, which pair as `enhancement` →
Feature, `chore` → Task and `bug` → Bug. An issue made with `gh issue create`
skips the template, so its type is set afterwards; `CLAUDE.md` has the
command.

## Step 2 — The pull request template

Open a pull request from any branch. Its description starts with `Closes #`.

## Step 3 — The skills

In Claude Code, at the repository root, type `/`. The list includes
`write-spec`, `start-work` and `open-pr`.

---

## Done when

- [ ] **New issue** offers the three templates, and each sets its label and Issue Type
- [ ] A new pull request opens with the template
- [ ] Claude Code lists the three skills

## Next

→ [004 — Sourcery](004-sourcery-setup.md)

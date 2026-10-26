---
name: start-work
description: Open an issue for a feature, chore or bug, and take an agreed one from the board to a branch. Use when work is being filed, or when a human has said to start.
---

# Starting work

## Opening the issue

1. Write the body from the matching template in `.github/ISSUE_TEMPLATE/`, and
   keep its sections.
2. Create it with its kind label and no assignee:

   ```bash
   gh issue create --label chore --title "<what, in plain words>" --body-file <file>
   ```

3. Set the Issue Type that pairs with the label (`enhancement` → Feature,
   `chore` → Task, `bug` → Bug), since `gh issue create` cannot:

   ```bash
   gh api repos/{owner}/{repo}/issues/<N> -X PATCH -f type=Task
   ```

4. The board's auto-add puts it in `Backlog` on its own. Check that it did:

   ```bash
   gh project item-list 3 --owner koodauspaja --format json \
     | jq -r '.items[] | select(.content.number == <N>) | .status'
   ```

## Before starting

Nothing below happens until both are true:

- **The work is agreed.** A human said **go** on the spec, or on the issue for
  a chore or a bug.
- **The start is authorised.** A human moved the card to `Ready`, or said to
  start, in any words.

If either is missing, ask, and wait. A question about what comes next,
permission to reshape the work, and silence are not a start.

## Starting

1. **Move the card to `Ready`**, unless a human already has. Quote, in the same
   message, the sentence that says to start.
2. **Move it to `In Progress`.**
3. **Create the branch** from an up-to-date `main`:
   `feature/NNN-short-name`, `chore/NNN-short-name` or `bug/NNN-short-name`, with
   NNN the issue number.

Moving a card:

```bash
item=$(gh project item-list 3 --owner koodauspaja --format json \
  | jq -r '.items[] | select(.content.number == <N>) | .id')
gh project item-edit --id "$item" --project-id PVT_kwDOB7brSc4Bo2vZ \
  --field-id PVTSSF_lADOB7brSc4Bo2vZzhnU5XA --single-select-option-id <option>
```

| Column | Option id |
|---|---|
| `Backlog` | `f75ad846` |
| `Ready` | `dab46c22` |
| `In Progress` | `47fc9ee4` |
| `In Review` | `f99c9ec9` |
| `Done` | `98236657` |

These are this board's ids. If a move fails with `does not belong to the
field`, read the current ones rather than guessing:

```bash
gh project field-list 3 --owner koodauspaja --format json \
  | jq '.fields[] | select(.name == "Status")'
```

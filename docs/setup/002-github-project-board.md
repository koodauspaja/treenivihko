# 002 — GitHub Project board

## Goal

An organisation project board that every issue lands on by itself and moves
across as the work goes from an idea to a merge.

This project: organisation `koodauspaja`, project `Treenivihko` (number `3`),
linked to the repository `treenivihko`.

---

## Step 1 — Create the project and link it

Your `gh` token needs the `project` scope; `gh auth status` lists the scopes,
and `gh auth refresh -s project` adds it.

```bash
gh project create --owner <your-org> --title Treenivihko
gh project link <number> --owner <your-org> --repo <your-org>/<your-repo>
```

`create` prints the project's URL, which ends in its number.

## Step 2 — Set the columns

The columns are the options of the project's `Status` field. A new project
has `Todo`, `In Progress` and `Done`; rename and add until it has these five,
in this order:

| Column | Means | Who moves a card into it |
|---|---|---|
| `Backlog` | An idea, or work not yet agreed | Arrives here on its own (Step 4) |
| `Ready` | The work is agreed and a human has authorised the start | **A human**, or Claude Code when a human has said to start |
| `In Progress` | Being implemented on a branch | Claude Code, when it starts |
| `In Review` | Pull request open, being reviewed | Claude Code, when it opens the pull request |
| `Done` | Merged to `main` | GitHub, on the merge (Step 4) |

**The names are exact, capitals included.** Tooling finds a column by its
name, so `In progress` is not `In Progress`.

`Ready` is the column the process turns on. A card there means a human has
agreed the work should begin; nothing is built before it gets there.

Project → **Settings** → **Status** edits the options by hand. This one was
set from the command line, keeping the ids of the three that already existed:

```bash
gh project field-list <number> --owner <your-org> --format json \
  | jq '.fields[] | select(.name == "Status")'
```

```bash
gh api graphql -f query='mutation { updateProjectV2Field(input: {
  fieldId: "<status-field-id>",
  singleSelectOptions: [
    {id: "<todo-id>", name: "Backlog", color: GRAY, description: "Ideas and work not yet agreed"},
    {name: "Ready", color: BLUE, description: "Agreed, and a human has authorised the start"},
    {id: "<in-progress-id>", name: "In Progress", color: YELLOW, description: "Being implemented on a branch"},
    {name: "In Review", color: PURPLE, description: "Pull request open, under review"},
    {id: "<done-id>", name: "Done", color: GREEN, description: "Merged to main"}
  ] }) { projectV2Field { ... on ProjectV2SingleSelectField { options { id name } } } } }'
```

## Step 3 — Show it as a board

A new project opens as a table. Project → the view's tab (`View 1`) → **⌄** →
**Layout: Board**, and rename the view `Board`. The board's columns come from
`Status`.

## Step 4 — Turn on the workflows

Project → **⋯** → **Workflows**. GitHub's API reads these but cannot change
them, so this step is done in the browser.

| Workflow | Setting |
|---|---|
| **Auto-add to project** | Repository `<your-repo>`, filter `is:issue`, **enabled**. Every new issue lands on the board without anybody adding it |
| **Item added to project** | Sets `Status` to `Backlog` |
| **Pull request merged** | Sets `Status` to `Done` |
| **Item closed** | Sets `Status` to `Done` |

`Auto-add to project` is the one that needs creating; the others exist on a
new project and need only their target status checked. Renaming `Todo` to
`Backlog` in Step 2 kept its id, so `Item added to project` already points at
`Backlog`.

## Step 5 — Labels and Issue Types

Every issue carries a label for **what kind of work it is**, paired with an
Issue Type:

| Label | Issue Type | For |
|---|---|---|
| `enhancement` | Feature | A feature, which starts from a spec |
| `chore` | Task | Setup, tooling, dependencies and other non-feature work |
| `bug` | Bug | Something that does not work as its spec says |

`enhancement` and `bug` exist on a new repository. Create `chore`:

```bash
gh label create chore --repo <your-org>/<your-repo> --color c5def5 \
  --description "Setup, tooling, dependencies and other non-feature work"
```

The Issue Types are the organisation's: Organisation → **Settings** → **Issue
types**. `Feature`, `Task` and `Bug` exist by default; confirm they are
enabled.

Labels for the part of the app an issue touches come later, once the specs
show what the parts are.

---

## Done when

- [ ] The project exists in your organisation and is linked to the repository
- [ ] `Status` has `Backlog`, `Ready`, `In Progress`, `In Review` and `Done`, in that order
- [ ] The view is a board
- [ ] A new issue appears on the board in `Backlog` by itself
- [ ] `chore` exists, and the three Issue Types are enabled

## Next

→ `003`, the pull request and issue templates, once it is written.

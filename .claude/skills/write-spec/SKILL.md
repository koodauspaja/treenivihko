---
name: write-spec
description: Write or check a feature spec in specs/ before any implementation. Use when a feature is being specified, or when a spec is to be confirmed before its go.
---

# Writing a spec

A spec is written together: a human starts it and owns the outcome, and Claude
drafts as much as it is asked to. It is done when every section below is
answered and a human says **go** on it.

**A gap means asking, not filling in.** A guessed edge case is worse than none,
because in review it looks intentional.

## Before writing

The feature has an issue, opened from the Feature template per `/start-work`.
The spec takes its feature's number, from the issue's title: Feature 007 is
`specs/007-short-name.md`, and its decision record `decisions/f007-short-name.md`
(`CLAUDE.md`, *Numbering*).

## Sections

1. **Summary**: one or two sentences on what it lets the child or the parent
   do, and why.
2. **Scope**: what is in, and what is explicitly out.
3. **Who and where**: the child or the parent, at home on wifi or at the field
   offline. Anything the child needs at the field has to fit in the notebook.
4. **What the user sees**: every string in exact Finnish, and where it
   appears. Words the child reads are short and plain, and exercise names are
   easy to remember and to write down.
5. **Data**: what is stored, and its shape. Any personal data, named field by
   field, with why it is needed. Data that is not needed is not stored.
6. **AI**, when the feature uses the Claude API: what it chooses from, what it
   may adjust and within which limits, what it is never allowed to do, and what
   the child and the parent see when the API is unavailable or answers with
   something unusable.
7. **Edge cases**: the expected behaviour for each, and every error state with
   its Finnish text.
8. **Logging**: for each failure, its level and what the line says. For each
   change to shared data, one line saying who did what, and the outcome. Ids
   only, never personal data. "None" is an answer; an empty section is not.
9. **Security and secrets**: environment variables the feature needs, and who
   may do what.
10. **Acceptance criteria**: concrete outcomes that can be checked. They
    become the issue's boxes.
11. **Tests**: what is tested, at which level, with the happy path and the edge
    cases.
12. **Open questions**: anything not yet settled, listed. The spec has no go
    while one is open. An empty list is fine.

Numbers are exact: "the last 5 sessions", not "recent sessions". The decision
record is written against them, and drift between the two is easy to spot
only when the spec is precise.

## Confirming

Go through the sections in chat and say, for each, whether it is answered.
List what is missing rather than filling it in. The spec has its go when the
human says so, never when Claude concludes that it is complete.

After the go, copy the Summary and the Acceptance criteria to the issue.

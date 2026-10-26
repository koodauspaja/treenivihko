---
name: self-review
description: The pass over your own diff before the first push, for the defect classes review keeps finding. Use before opening a pull request, and on what a later push changes.
---

# Self-review

The defects a reviewer keeps finding, each with the check that catches it.
Every class comes from a real review: from the earlier project's measured
review history, from this repository's first pull request with Sourcery (#7:
29 findings over three rounds), or, for the last two, from what this app
must never get wrong.

Run it on the diff as it will be pushed, before the first push, and again on
what each later push changes. It takes minutes; a review round takes longer.

## The pass

1. Read the whole diff as if someone else wrote it.
2. Go through the classes below, and for each one the diff touches, do its
   counter. Not every class applies to every diff, but say to yourself which
   do not, rather than skipping the list.
3. For every test added, run its mutation (class 4).
4. Run `npm run verify`: lint, the type check, the unit tests at 100% coverage
   with `coverage-gaps`, the build and the end-to-end tests.
5. Write in the pull request what the pass changed, or that it found nothing.

## The classes

### 1. Prose that contradicts the code

The largest class in the earlier project's history, usually written by the
same hand as the code an hour before.

**Looks like:** a comment naming the wrong function. A spec typing a field as
a number after the code made it a string. A count in prose ("all four
blocks") written before a fifth existed.

**Counter:** when behaviour changes, search for the old behaviour's *words*,
not only its code: the value, the name, the mechanism, across `specs/`,
`decisions/`, comments, skills and tests. Prefer a table row to a sentence for
anything countable.

### 2. A check and an action on different states

**Looks like:** a value read, then a write based on it, with nothing stopping
the state changing in between. A duplicate check another request can
invalidate before the insert. On the client, a response applied after the
user has moved on to something else. In a process: a gate passed on one
commit, and a merge of a later one (#7).

**Counter:** for every read whose answer decides a later action, name what
keeps the state from changing in between: a transaction, a lock, a version
column, a fresh read immediately before acting. "Nothing usually does" is the
finding.

### 3. A check that passes what it cannot classify

**Looks like:** an identity matched by "contains" rather than equality, so
any account with a similar name passes (#7). One page of results read as all
of them, with no sign it was cut short (#7). A body that starts like the
expected one, accepted without reading the rest (#7). A command that prints
its error where its answer goes, so a guard asking "is it empty?" takes the
error for an answer (#8). A file called documentation by its new name after a
rename from code.

**Counter:** for every check, gate or classifier, ask what it does with an
input it does not recognise, and make that answer "fail". Match identities
exactly. Print the page cursor, or the total, with every paged answer. Name
the things that pass, never the things that fail: an allowlist a reader can
check, not a denylist someone has to keep complete.

### 4. A test that proves nothing

**Looks like:** a test that still passes with the behaviour it names deleted.
A fixture that cannot show the difference, such as a one-colour image for a
rotation test. A test asserting the wrong message, and so protecting the bug.
A test that passes only because the test before it left a mock configured.

**Counter, and it is not optional: run the mutation.** Break the behaviour the
test names (delete the line, revert the value, remove the guard), watch the
test fail, then restore. If it does not fail, it is decoration. Reset mocks'
implementations, not only their calls, between tests.

### 5. A failure that looks like an answer

**Looks like:** a failed lookup returned as an empty list, which the page then
reports as "nothing here". A rejected promise that nobody catches. A query
with no error handling, so one database blip becomes an error page.

**Counter:** for each new call that can fail, answer two questions in the
diff: who catches it, and what does the user see? A failure never shares a
value with "there is nothing": a function that can fail returns failure as its
own case.

### 6. The same value under two normalisations

**Looks like:** input lower-cased on one side and compared against a
case-sensitive column on the other. Paths built with one separator and matched
with another. A count shown before deduplication against rows written after
it.

**Counter:** where a value crosses a boundary (user to server, server to
database, tool to tool), write down its canonical form once and convert at
the edge. Then find every other place that compares the same value; this
class arrives in pairs.

### 7. A parser that accepts too much

**Looks like:** `Number("")` is `0`, `Number("0x10")` is `16`,
`parseInt("2abc")` is `2`. A pattern anchored so a prefix walks past it.

**Counter:** write down what the field *is* ("a whole number of minutes from
1 to 120"), then test the boundary from both sides: the largest value
accepted and the smallest rejected. Keep the rule in one place.

### 8. A guard on the named line only

**Looks like:** validation added where a reviewer pointed, while another path
that stores the same input parses it with its own copy of the rule.

**Counter:** after a fix, search for every other reader of the same input. Two
readers means one shared function, not two guards.

### 9. What a check cannot see

**Looks like:** a rule that reads files, relied on for a pull request's
description, a commit message or an issue, none of which it sees (#7). A
coverage report trusted for a file no test imports, which is missing from it
rather than at 0%.

**Counter:** for every check the work leans on, name what it cannot see, and
who covers that instead. If nobody does, the gap is either covered in this
diff or written down where the next reader will find it.

### 10. A failure or a write that leaves no record

**Looks like:** a server action that writes and returns success with no log
line. A refused sign-in recorded nowhere. A log line carrying a name because
the object was to hand.

**Counter:** for each new call that can fail, name the line it logs. For each
new write to shared data, name the line that says who did it, to what, and the
outcome, a refusal included. Then read each line's fields: ids only.

### 11. English reaching the Finnish UI

A rule written in `CLAUDE.md` is still not a check.

**Counter:** read every new string a user can see, including errors, empty
states, alt text and anything passed through from a library, the browser or
an API.

### 12. A cached value shared between readers

**Looks like:** one URL for every user's picture, cached for a year, so a
second user signing in on the same device sees the first one's.

**Counter:** for anything cached, name two things separately: what makes it
change when the content changes, and what keeps one reader's copy away from
another reader. A timestamp answers the first and not the second.

### 13. Personal data where it should not be

The repository is public and the user is a child.

**Looks like:** a real name in a fixture, a test, a seed file or an example. A
log line or an error message carrying a name, an email or a note the parent
wrote. A screenshot in a pull request showing real data. Personal data in a
commit message, an issue or a pull request's text.

**Counter:** read every fixture, example, log line and error message the diff
adds, and the commit messages, title and body before they are sent. Invented
names only; ids only in logs. Data a feature does not need is not stored.

### 14. AI output used unchecked

The AI chooses from the library and never invents.

**Looks like:** the model's answer shown, stored or returned before every
exercise it names is found in the library and every value it adjusts is
within its limits. A malformed or partial answer treated as an empty program.
A prompt that lets the model describe an exercise in its own words, which
then reach the child.

**Counter:** follow the answer from the API call to every place it is used,
and name the check it passes on the way. Test a made-up exercise, an
out-of-range value and a malformed answer, and see each rejected, with what
the user sees instead.

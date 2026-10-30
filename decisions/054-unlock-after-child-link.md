# 054 — The child's side opens the trainer side with a full load

Issue: #54. Adds to `decisions/f001-trainer-side.md`.

## Context

When the trainer side was reached through the `Valmentaja` link on the
child's side, the right password did not open it: the browser came back to
the lock page with an empty field, and the second try worked. The server
accepted the first try each time.

The link was a `Link`, so it navigated on the client. While the trainer side
is locked, `/valmentaja` redirects to `/valmentaja/avaa` from inside its
`Suspense` boundary, and Next's client router keeps that as where
`/valmentaja` leads. The unlock action then redirects to `/valmentaja`, and
the router, rather than fetch it, goes back to the lock page, the same
request it made after the link. Recorded in the end-to-end setup, that second
request carries the same `_rsc` key as the first.

## Decision

- **The child's side links to the trainer side with a plain `<a>`**, so the
  browser loads `/valmentaja` in full, and the client router holds nothing
  for it when the password is given.
- **An end-to-end test follows the link and gives the password**, on phone
  and desktop, and checks that the trainer menu shows and the password field
  is hidden. Next keeps the page it left in the document, hidden, so a check
  of what exists, or of the address alone, passes on the bug.

## Why

| Decision | Why |
|---|---|
| A plain link, not an invalidation in the action | `revalidatePath("/trainer")`, and `revalidatePath("/", "layout")`, before the redirect left the bug as it was: what the router keeps is not the server's cache those purge |
| Not the lock check moved before rendering | With `cacheComponents`, the trainer pages read the unlock inside `Suspense`; moving it out, or into the proxy, changes every trainer page for one link |
| The full load is cheap here | The child's side is left for another page; nothing on it is kept across the navigation |

## Consequences

- **A trainer page's own `Link` to `/valmentaja` can still meet this**, if the
  unlock has ended while the page is open, as when another tab locks it, and
  the parent clicks it. The lock page then needs the password twice, as
  before. Nothing is lost.
- **A new link into the trainer side from outside it is a plain `<a>` too**,
  for the same reason.

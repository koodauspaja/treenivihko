# F001 — The trainer side, behind the app's own password

Spec: `specs/001-trainer-side.md`. Issue: #34.

## Context

The parent signs in with Google on the home device, and the child uses that
device signed in as the parent (`decisions/029-sign-in.md`). The trainer side,
where the parent sets things up, has to stay out of the child's reach on that
same signed-in browser, and Google's password cannot be the lock: the parent
does not type it there, and the child must not be able to pass Google's
check either.

## Decision

- **Three tables**: `child` (one per parent, a nickname of 1 to 20
  characters or none), `trainer_password` (a scrypt hash, the count of wrong
  tries, a lockout end) and `trainer_unlock` (which session has the trainer
  side open, until when). Each goes with its user or session.
- **Only a command sets the password**: `npm run trainer:set-password`, run
  through `railway ssh`, reads it twice from standard input, never echoed,
  and sets it for the one user there is. The first password too: nothing on
  the device can set, change or reset it.
- **An unlock belongs to one session** and lasts 15 minutes from its last
  use. `requireTrainer` moves it on in the same statement that checks it, on
  every trainer page and action. An open trainer page leaves for the child's
  side when its end comes.
- **5 wrong passwords in a row lock it for 15 minutes**, per profile. The
  count and the lockout are one `UPDATE`, whose condition repeats the checks
  the try was made under: not locked, and the same hash. A try that raced a
  lockout or a replaced password writes nothing. Locking sets the count back
  to 0, so the next 15 minutes give 5 tries again.
- **Failures are logged by Postgres's reason, never Drizzle's message**,
  which carries the query's values: a password's hash, or a nickname. The
  error passed on carries the same line, since Next logs it too.
- **Better Auth reads the client's address from `X-Real-IP`**, which
  Railway's edge sets on every request.
- **The end-to-end tests sign in for real**: a Better Auth instance with
  email sign-up, on the test database and the server's test secret, creates
  the session and its cookie. Each browser project has its own parent. The
  e2e job gets the integration job's Postgres service.

## Why

| Decision | Why |
|---|---|
| The command for the first password, not the app on the first visit | Until the parent had set it, whoever pressed `Valmentaja` first, the child included, would choose it |
| A command, not a reset through Google | The home device stays signed in to the parent's Google account, so Google could pass a reset straight through |
| Wrong tries counted per profile only | Only a signed-in browser reaches the lock page, and only the parent's devices are signed in: a per-client count would add nothing |
| The unlock in the database, keyed by session | Signing out deletes the session, and the unlock with it; a cookie of its own could outlive both |
| The nickname normalised to NFC, counted by code point | The same name typed two ways is the same nickname, and its length is what Postgres's `char_length` counts |
| `X-Real-IP` rather than `X-Forwarded-For` | Railway's `X-Forwarded-For` holds more than one address, which Better Auth refuses without trusted proxies, and Railway's proxy ranges are not stable enough to list |
| `store.ts` excluded from unit coverage | Each function is a query whose point is what Postgres does with it; `tests/integration/trainer.test.ts` runs them, races included |

## Consequences

- **The command needs `railway ssh`**, so the parent's Railway login, to set
  or replace the password; a forgotten one is replaced the same way.
- **The command's scripts redeploy the service** when they change: they are in
  `.railway/railway.ts`'s watch paths, so that file is applied after the merge.
- **`X-Real-IP` sometimes carries an edge's address**, by Railway users'
  reports. Then Better Auth's rate limiting shares one bucket again, as before
  this change, and the trainer password's own lockout is unaffected.

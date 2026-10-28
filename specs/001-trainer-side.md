# 001 — Trainer side

Issue: #34

## Summary

The parent signs in once with Google and the app opens the child's side,
greeting the child by a nickname. The trainer side, where the parent sets
things up, opens only with the app's own password, so the child can use the
signed-in device without reaching it.

## Scope

**In**

- The child's profile: one per signed-in parent, holding a nickname.
- The child's side: a greeting, the existing placeholder, and a link to the
  trainer side.
- The trainer side's lock: a password page, and the trainer side behind it.
- The trainer side's first page: the nickname, **Lukitse** and **Kirjaudu ulos**.
- Setting or replacing the password with a command the parent runs on Railway.
- Better Auth's rate limiting resolving each client's address on Railway.

**Out**

- More than one child, and roles beyond the parent and the child.
- Setting, changing or resetting the password inside the app: the command
  does all three, so nothing on the home device can.
- Counting wrong passwords per client: only a signed-in browser reaches the
  lock page, so the count per profile covers it.
- Anything of the trainer side beyond its first page: exercises, periods and
  the rest are later features.

## Who and where

The parent, at home on wifi: signs in with Google on the home device, sets the
password from their own machine, and opens the trainer side on any signed-in
browser. The child, at home on the same device, signed in as the parent: sees
the child's side only. Nothing here is used at the field.

## What the user sees

Addresses are Finnish rows in `src/lib/routes.ts`; folders are English.

**The child's side**, at `/`, after sign-in:

| Where | Text |
|---|---|
| Heading, with a nickname | `Hei, ‹nickname›!` |
| Heading, without one | `Hei!` |
| Body | `Treenit tulevat tänne pian.` (as today) |
| Link to the trainer side, small, at the bottom | `Valmentaja` |

Feature 005 replaces the body with the period to copy into the notebook
(`specs/005-notebook-view.md`).

**The lock page**, at `/valmentaja/avaa`:

| Where | Text |
|---|---|
| Heading | `Valmentaja` |
| Password field's label | `Salasana` |
| Button | `Avaa` |
| Link back to the child's side | `Takaisin` |
| After a wrong password | `Väärä salasana.` |
| While locked out (below) | `Liian monta yritystä. Yritä uudelleen ‹n› minuutin päästä.`, ‹n› the whole minutes left, rounded up |
| When no password has been set | `Valmentajan salasanaa ei ole vielä asetettu.`, and no field or button |

**The trainer side**, at `/valmentaja`:

| Where | Text |
|---|---|
| Heading | `Valmentaja` |
| Nickname field's label | `Lapsen nimi` |
| Button | `Tallenna` |
| After saving | `Tallennettu.` |
| A nickname of the wrong length | `Nimessä on oltava 1–20 merkkiä.` |
| Button that locks and returns to the child's side | `Lukitse` |
| Button that signs out | `Kirjaudu ulos` |

A failure the user cannot fix shows the existing error page, `Jokin meni
vikaan.` and `Yritä uudelleen`.

## Behaviour

- **Unlocking**: the correct password opens the trainer side for this browser
  session only. It stays open while used: each trainer page load or action
  moves its expiry to 15 minutes from then.
- **Locking**: **Lukitse** locks at once. 15 minutes without a trainer
  request locks too: the server refuses after that, and an open trainer page
  goes to the child's side by itself when its 15 minutes run out. Either way
  the browser lands on the child's side.
- **Wrong passwords**: after 5 wrong passwords in a row, the password cannot
  be tried for 15 minutes, for the profile, whatever browser tries it. A
  correct password resets the count to 0. A try during the 15 minutes is
  refused unchecked and does not add to the count.
- **Signing out**: **Kirjaudu ulos** ends the Google session and its unlock,
  and lands on the sign-in page, `/kirjaudu`.
- **The nickname**: trimmed of surrounding spaces, then 1–20 characters.
  Saved for the profile, shown on the child's side straight away.
- **The password command**: `npm run trainer:set-password`, run through
  `railway ssh` on the service, reads the new password twice from standard
  input, never from an argument, and replaces any earlier one. A password is
  8–128 characters. Setting it ends every open unlock. The exact command is in
  setup 011.
- **Client addresses**: Better Auth reads the client's address from
  `X-Real-IP`, which Railway's edge sets on every request and overwrites when
  a client sends its own.

## Data

| Table | Columns | Why |
|---|---|---|
| `child` | `id`; `user_id`, unique, references `user`, deleted with it; `nickname`, text, nullable, 1–20 characters; `created_at`; `updated_at` | The profile later features attach marks to. Created, without a nickname, the first time the child's side loads |
| `trainer_password` | `user_id`, primary key, references `user`, deleted with it; `password_hash`, text; `failed_attempts`, integer, 0 or more; `locked_until`, timestamp, nullable; `updated_at` | The app's own password, stored only as a hash, and the count of wrong tries |
| `trainer_unlock` | `session_id`, primary key, references Better Auth's `session`, deleted with it; `expires_at`, timestamp | Which signed-in browser has the trainer side open, and until when |

**Personal data**: `child.nickname` only. It is what the parent types, needed
for the greeting, and nothing requires it to be a real name. The password is
stored only as a hash (Better Auth's scrypt), and never logged, returned or
shown. No address is stored.

## AI

Not used.

## Edge cases

| Case | Behaviour |
|---|---|
| The trainer side opened while locked, or by its address | The lock page |
| No password set | The lock page says `Valmentajan salasanaa ei ole vielä asetettu.` and offers no field |
| An empty password submitted | Refused in the browser; the server treats it as wrong |
| Wrong password, tries 1 to 4 | `Väärä salasana.`; the count goes up by 1 |
| Wrong password, try 5 | Locked out for 15 minutes; the lockout message, with ‹n› 15 |
| Any try while locked out | The lockout message, ‹n› the minutes left; nothing checked or counted |
| Two wrong tries at the same moment | Each counted once: the count and the lockout are written in one statement, so a 6th try never slips through |
| The 15 minutes end with a trainer page open | The page goes to the child's side |
| A trainer action sent after the 15 minutes | Refused; the browser is sent to the lock page |
| A nickname of 0 or over 20 characters, after trimming | `Nimessä on oltava 1–20 merkkiä.`; nothing saved |
| The password replaced by the command | Every open unlock ends; the next trainer request goes to the lock page |
| The Google session expires or ends | Its unlock goes with it; sign-in as today |
| Signed out | Sign-in as today; the trainer side's addresses go to `/kirjaudu` |
| The database unreachable | The existing error page |
| The command given a password under 8 or over 128 characters, or two that differ | Refused with a message in English, as it is a tool; nothing changes |

## Logging

Ids only: the user, session and child ids. Never the password, its hash, the
nickname or an address.

| Event | Level | Line |
|---|---|---|
| Trainer side unlocked | info | `trainer unlocked` userId sessionId |
| Wrong password | warn | `trainer password refused` userId failedAttempts |
| Locked out | warn | `trainer password locked out` userId lockedUntil |
| A try while locked out | warn | `trainer password refused while locked out` userId |
| Locked with **Lukitse** | info | `trainer locked` userId sessionId |
| Nickname saved | info | `child nickname updated` userId childId |
| Child profile created | info | `child created` userId childId |
| Password set by the command | info | `trainer password set` userId, and the number of unlocks it ended |
| A database failure in any of these | error | the event's name, `failed`, the ids, and the error's message |

## Security and secrets

- **No new environment variables.** The command uses the service's
  `DATABASE_URL`.
- **Who may do what**: only a signed-in, allowlisted user reaches either side.
  Every trainer page and action checks, on the server, that this session's
  unlock exists and has not expired, then moves its expiry; the check is not
  only on the page.
- **The password** is the parent's, and is set only through `railway ssh`,
  which needs the parent's Railway login. Nothing on the home device can set
  or reset it.

## Acceptance criteria

- [ ] Signed in, `/` shows `Hei!`, and after a nickname is saved, `Hei, ‹nickname›!`
- [ ] `Valmentaja` on the child's side leads to the lock page at `/valmentaja/avaa`
- [ ] With no password set, the lock page says `Valmentajan salasanaa ei ole vielä asetettu.` and has no field
- [ ] `npm run trainer:set-password` through `railway ssh` sets the password, refuses one under 8 characters and two that differ, and takes it from standard input only
- [ ] The correct password opens `/valmentaja`; a wrong one shows `Väärä salasana.`
- [ ] The 5th wrong password in a row locks it for 15 minutes, with the lockout message, also from another browser
- [ ] `/valmentaja` opened without an unlock, or 15 minutes after the last trainer request, goes to the lock page, and an open trainer page goes to the child's side when its 15 minutes run out
- [ ] **Lukitse** returns to the child's side, and `/valmentaja` then asks for the password again
- [ ] **Kirjaudu ulos** lands on `/kirjaudu`, and `/` then needs sign-in
- [ ] A nickname is saved trimmed, and one of 0 or over 20 characters is refused with `Nimessä on oltava 1–20 merkkiä.`
- [ ] Replacing the password ends every open unlock
- [ ] Every log line in *Logging* is written, with ids and no personal data

## Observed after the merge

- On Railway, after a sign-in, Better Auth no longer logs that it could not
  determine a client IP.

## Tests

| Level | What |
|---|---|
| Unit | The password rule (7, 8, 128 and 129 characters); the nickname rule (0, 1, 20, 21 after trimming, and spaces only); the lockout rule (the 5th wrong try locks, the count resets on success, tries while locked are not counted, ‹n› rounded up at 15:00, 14:01 and 0:01 left); the unlock expiry (moved on use, refused at 15 minutes); the route table rows; the lock page's message for each state |
| Integration, against Postgres | The tables and their deletes with the user and the session; the count and the lockout in one statement, with concurrent wrong tries counted once each; the command's write ending unlocks; the child row created once when two loads race |
| End to end | With a session seeded in the test database: the greeting, the link, a wrong password, unlocking, **Lukitse**, the trainer page leaving at expiry (with a shortened clock), saving a nickname, and signing out |

## Open questions

None.

# 029 — Sign-in

## Context

Every feature sits behind sign-in. One parent signs in, on the child's device
as well as their own, and the app then opens the child's side by itself. The
trainer side asks for a password of its own, which is the next feature's.

## Decision

- **Google is the only way in, through Better Auth 1.7**, under `src/lib/auth`.
  The server is made on first use, as the database client is, so a build needs
  none of sign-in's variables.
- **An allowlist decides who may sign in**: `AUTH_ALLOWED_EMAILS`,
  comma-separated, compared without case or surrounding spaces. It is checked
  in Better Auth's `user.validateUserInfo`, which runs before a user is
  created, before an account is linked, and on every Google sign-in. An empty
  list lets nobody in. A refusal returns `sign_in_not_allowed`, which the
  sign-in page shows in Finnish, and logs one line without the address.
- **One Google Cloud project, its consent screen in Testing**, with one OAuth
  client for localhost and Railway.
- **Sign-in lands on the child's side**, `/`, a placeholder that shows nothing
  of the parent's. No sign-out button yet: the trainer side puts one behind its
  password.
- **A session lasts 90 days and renews on use**, at most once a day.
- **Google's tokens are never stored.** A `databaseHooks` hook empties them
  before any account row is written.
- **Better Auth's four tables as it asks**, `password` and `image` included,
  in the first migration, `create_auth_tables`.
- **A request without a session cookie never reaches the auth server**, so a
  signed-out page needs no variables and no database.
- **Public addresses are Finnish, folders English.** `src/lib/routes.ts` is
  one table read twice by `next.config.ts`: a rewrite from each address to its
  folder, and a 308 redirect from the folder's path back to the address.
  `/kirjaudu` is served from `src/app/sign-in`.
- **IP addresses stay on sessions**, Better Auth's default.

## Why

| Decision | Why |
|---|---|
| The app's own allowlist | Google's test-user list restricts nobody for an app that asks only for `openid`, `email` and `profile`: measured on the earlier project, any Google account signed in to an app in Testing |
| An empty list refuses everyone | A missing variable must not open the app to every Google account |
| Checked in `validateUserInfo` | It gates creation and every Google sign-in, so an address taken off the list cannot sign in again. Better Auth fails closed if the check throws |
| Testing, not published | Publishing needs a privacy policy page and a domain Google can verify, which a `railway.app` address is not. Testing's seven-day limit applies to Google's tokens, which nothing keeps |
| 90 days, renewed on use | The child's device stays signed in between uses a few times a week; the parent signs in there once |
| No sign-out on the child's side | The child would sign the parent out; signing out belongs behind the trainer side's password |
| No tokens stored | Nothing calls Google after sign-in, and the ID token is the parent's name, address and picture, readable; `encryptOAuthTokens` covers the access and refresh tokens but not it |
| `password` and `image` kept | Measured: Better Auth 1.7 checks the Drizzle schema at start-up and refuses ("Drizzle schema mismatch") without them. `password` stays empty; `image` holds Google's picture link |
| The cookie check first | CI's end-to-end job then needs no auth variables and no database, and a signed-out visit costs no lookup |
| Finnish addresses, English folders | CLAUDE.md: Finnish only where a reader sees it. The table keeps the two in one place, and the redirect keeps an English path from becoming a second address |
| IP addresses kept | `disableIpTracking` also switches off Better Auth's rate limiting on sign-in, which is worth more than leaving the address out of a session row |
| The trainer side's password is not Google's | The parent unlocks the trainer side on the child's device; it is the app's own, stored as a hash, in the next feature |

## Consequences

- **A second adult** is one more address in `AUTH_ALLOWED_EMAILS`, on Railway
  and in `.env`, and a Google test user. A changed variable reaches the running
  app only through a redeploy.
- **Removing an address** stops that account signing in again once the app has
  redeployed; a session it already has lasts until it expires or is deleted.
- **A new page** gets an English folder and, if a reader sees its address, a
  row in `src/lib/routes.ts`.
- **The first migration is applied**, on Railway as well, so a change to these
  tables is a new migration.

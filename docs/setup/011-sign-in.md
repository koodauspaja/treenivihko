# 011 — Sign-in

## Goal

The parent signs in with Google, and only the addresses on an allowlist can.
Google Cloud holds the OAuth client; its two values, a secret of the app's own
and the allowlist go in `.env` locally and in Railway's variables. Why it is
built this way: `decisions/029-sign-in.md`.

---

## Step 1 — The Google Cloud project

At <https://console.cloud.google.com>: the project menu → **New project**,
named after the app (`treenivihko` here). Check it is the selected project for
every step below.

## Step 2 — Google Auth Platform

Menu → **Google Auth Platform** (or **APIs & Services → OAuth consent
screen**) → **Get started**:

| Step | Fill in |
|---|---|
| App information | The app's name; your address as the support email |
| Audience | **External**. Internal is for Google Workspace organisations only |
| Contact information | Your address |
| Finish | Accept the user data policy → **Create** |

Then:

- **Branding:** no logo, which would start Google's verification, and no app
  domain or authorised domain, which only publishing needs.
- **Audience:** keep **Testing**, and do not publish: publishing needs a
  privacy policy page and a domain Google can verify. **Add each allowed
  address as a test user**, though today the list restricts nobody: for an app
  asking only for name and email, Google lets any account through while in
  Testing (measured on the earlier project, with accounts not on the list).
  The app's own allowlist is the gate; the test users keep the allowed
  addresses working if Google starts enforcing its list.
- **Data Access:** add no scope. `openid`, `email` and `profile` come by
  themselves; anything more needs verification.

## Step 3 — The OAuth client

**Clients → Create client → Web application**:

| Field | Value |
|---|---|
| Authorised JavaScript origins | empty |
| Authorised redirect URIs | `http://localhost:3000/api/auth/callback/google`<br>`https://<your Railway domain>/api/auth/callback/google` |

The URIs must match exactly: `http` for localhost, no trailing slash. Download
the JSON; Google may not show the secret again.

## Step 4 — The values, locally

From the repository root, with the downloaded file in `$f`:

```bash
f=$(ls ~/Downloads/client_secret_*.json)
{
  echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)"
  echo "BETTER_AUTH_URL=http://localhost:3000"
  echo "GOOGLE_CLIENT_ID=$(jq -r .web.client_id "$f")"
  echo "GOOGLE_CLIENT_SECRET=$(jq -r .web.client_secret "$f")"
  echo "AUTH_ALLOWED_EMAILS=<your address>"
} >> .env
```

## Step 5 — The values, on Railway

`.railway/railway.ts` declares these four by name only, so an apply keeps
what is set; `BETTER_AUTH_URL` it sets itself, from the service's domain.
`--stdin` keeps each value off the command line:

```bash
openssl rand -base64 32 | railway variable set BETTER_AUTH_SECRET --stdin -s treenivihko --skip-deploys
jq -r .web.client_id "$f" | railway variable set GOOGLE_CLIENT_ID --stdin -s treenivihko --skip-deploys
jq -r .web.client_secret "$f" | railway variable set GOOGLE_CLIENT_SECRET --stdin -s treenivihko --skip-deploys
printf '%s' '<your address>' | railway variable set AUTH_ALLOWED_EMAILS --stdin -s treenivihko --skip-deploys
```

Then keep the JSON in a password manager, or delete it.

## Step 6 — Check it

```bash
npm run db:migrate
npm run dev
```

At <http://localhost:3000>: you land on `/kirjaudu`. Signing in with an
address on the list lands on the child's side; another Google account comes
back to `/kirjaudu` with "Tällä Google-tilillä ei voi kirjautua
Treenivihkoon." and leaves no user row. Then the same on Railway.

## Step 7 — The trainer password

The trainer side opens with the app's own password, never the Google one, and
only this command sets or replaces it, so nothing on the home device can
(`decisions/f001-trainer-side.md`). It asks for the password twice, without
echoing it, and sets it for the one user there is: sign in with Google first.
A password is 8 to 128 characters. Setting it ends every open unlock.

Locally:

```bash
npm run trainer:set-password
```

On Railway, in the running service, which has the database's address:

```bash
railway ssh -s treenivihko -- npm run trainer:set-password
```

Then `/valmentaja` asks for it.

---

## Later

- **Another adult:** add their address to `AUTH_ALLOWED_EMAILS`,
  comma-separated, on Railway and in `.env`, and as a Google test user (Step
  2). The running app sees a changed variable only after a redeploy: Railway
  redeploys on a change by itself, except after `--skip-deploys`, when
  `railway redeploy -s treenivihko` does it. Once they have signed in, Step
  7's command refuses, since it sets the password of the only user there is;
  choosing whose is a change of its own.
- **Rotating the client secret:** a new secret in Google Cloud, then Step 5's
  `GOOGLE_CLIENT_SECRET` line again, and `.env`.
- **Signing a device out:** **Kirjaudu ulos** on the trainer side. For a device
  out of reach, delete the user's rows in `session`; the cookie then points at
  nothing.
- **A forgotten trainer password:** Step 7 again; it replaces the old one.

---

## Done when

- [ ] An address on the list signs in, locally and on Railway, and lands on the child's side
- [ ] Another Google account is refused with the Finnish message, and leaves no user row
- [ ] `railway config plan` reports the configuration up to date
- [ ] The trainer password is set on Railway, and `/valmentaja` opens with it

## Next

→ The features, starting with Feature 002, the exercise library.

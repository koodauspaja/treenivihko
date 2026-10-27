/**
 * The Better Auth server: Google the only provider, sessions in Postgres, and
 * the allowlist deciding who may sign in. Made on first use, as the database
 * client is, so a build needs none of its variables.
 *
 * decisions/029-sign-in.md
 */

import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDatabase } from "@/lib/db/index";
import { account, session, user, verification } from "@/lib/db/schema";
import { reportUserCreated, signInRefusal } from "./allowlist";
import { withoutPicture, withoutTokens } from "./google-data";

type Environment = Readonly<Record<string, string | undefined>>;

const DAY_SECONDS = 24 * 60 * 60;

/** How long a session lasts without use. */
export const SESSION_DAYS = 90;

/**
 * The variables sign-in cannot work without, each read by name, or an error
 * naming every one that is missing. `AUTH_ALLOWED_EMAILS` may be empty.
 */
export function requireVariables(env: Environment = process.env) {
  const value = (read: string | undefined) => read?.trim() ?? "";
  const variables = {
    BETTER_AUTH_SECRET: value(env.BETTER_AUTH_SECRET),
    BETTER_AUTH_URL: value(env.BETTER_AUTH_URL),
    GOOGLE_CLIENT_ID: value(env.GOOGLE_CLIENT_ID),
    GOOGLE_CLIENT_SECRET: value(env.GOOGLE_CLIENT_SECRET),
  };
  const missing = Object.entries(variables)
    .filter(([, value]) => value === "")
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`sign-in needs ${missing.join(", ")}: see .env.example`);
  }
  return variables;
}

/** Better Auth's options, from the environment; apart from `getAuth` so a test can read them. */
export function authOptions(env: Environment = process.env) {
  const variables = requireVariables(env);
  return {
    secret: variables.BETTER_AUTH_SECRET,
    baseURL: variables.BETTER_AUTH_URL,
    database: drizzleAdapter(getDatabase(), {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    socialProviders: {
      google: {
        clientId: variables.GOOGLE_CLIENT_ID,
        clientSecret: variables.GOOGLE_CLIENT_SECRET,
      },
    },
    user: {
      // Read at each sign-in rather than at load, so a test can set it. On Railway a
      // changed value reaches the process only through a redeploy.
      validateUserInfo: ({ user: identity }: { user: { email?: unknown } }) =>
        signInRefusal(identity.email, process.env.AUTH_ALLOWED_EMAILS),
    },
    // The child's device stays signed in: each use renews the 90 days, at most once a day.
    session: { expiresIn: SESSION_DAYS * DAY_SECONDS, updateAge: DAY_SECONDS },
    // Google's tokens and picture are dropped before a row is written, on every sign-in.
    databaseHooks: {
      user: {
        create: {
          before: (row) => Promise.resolve({ data: withoutPicture(row) }),
          after: (created) => Promise.resolve(reportUserCreated(created.id)),
        },
        update: { before: (row) => Promise.resolve({ data: withoutPicture(row) }) },
      },
      account: {
        create: { before: (row) => Promise.resolve({ data: withoutTokens(row) }) },
        update: { before: (row) => Promise.resolve({ data: withoutTokens(row) }) },
      },
    },
    telemetry: { enabled: false },
    // Writes Better Auth's cookies through Next's cookie API; it must be last.
    plugins: [nextCookies()],
  } satisfies BetterAuthOptions;
}

const createAuth = () => betterAuth(authOptions());

let instance: ReturnType<typeof createAuth> | undefined;

/** The Better Auth server, made on first use. */
export function getAuth() {
  instance ??= createAuth();
  return instance;
}

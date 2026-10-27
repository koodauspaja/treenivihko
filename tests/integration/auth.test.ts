import { existsSync, readdirSync, readFileSync } from "node:fs";
import { betterAuth } from "better-auth";
import { convertSetCookieToCookie } from "better-auth/test";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authOptions } from "@/lib/auth/server";
import { closeDatabase, getDatabase, openMigrationDatabase } from "@/lib/db/index";
import {
  journalTagsIn,
  MIGRATION_JOURNAL,
  MIGRATIONS_FOLDER,
  migrationLock,
  runMigrations,
  sqlFilesIn,
} from "@/lib/db/migrations";
import { account, session, user } from "@/lib/db/schema";

// Test-only values: nothing here reaches Google. decisions/029-sign-in.md
const ENV = {
  BETTER_AUTH_SECRET: "integration-test-secret-of-32-characters",
  BETTER_AUTH_URL: "http://localhost:3000",
  GOOGLE_CLIENT_ID: "integration-test-client-id",
  GOOGLE_CLIENT_SECRET: "integration-test-client-secret",
};
const ALLOWED = "parent@example.com";
const PASSWORD = "integration-test-password";

// Google's sign-in cannot run here, so users are created through email sign-up,
// which passes the same allowlist: it applies to every way a user is created.
// decisions/029-sign-in.md
const auth = betterAuth({
  ...authOptions(ENV),
  plugins: [],
  emailAndPassword: { enabled: true },
});

const usersWithEmail = (email: string) =>
  getDatabase().select().from(user).where(eq(user.email, email));

beforeAll(async () => {
  process.env.AUTH_ALLOWED_EMAILS = ALLOWED;
  const migration = openMigrationDatabase();
  try {
    await runMigrations({
      exists: existsSync,
      sqlFiles: () => sqlFilesIn(readdirSync(MIGRATIONS_FOLDER)),
      journalTags: () => journalTagsIn(readFileSync(MIGRATION_JOURNAL, "utf8")),
      migrate: (folder) => migrate(migration.database, { migrationsFolder: folder }),
      ...migrationLock(migration.database),
    });
  } finally {
    await migration.close();
  }
  await getDatabase().delete(user);
});

afterAll(async () => {
  await getDatabase().delete(user);
  delete process.env.AUTH_ALLOWED_EMAILS;
  await closeDatabase();
});

describe("sign-in against the test database", () => {
  it("refuses an address not on the allowlist, and creates no user", async () => {
    const attempt = auth.api.signUpEmail({
      body: { email: "stranger@example.com", password: PASSWORD, name: "Test Stranger" },
    });
    await expect(attempt).rejects.toMatchObject({ status: "FORBIDDEN" });
    await attempt.catch((error: { body?: { code?: string } }) => {
      expect(error.body?.code).toBe("sign_in_not_allowed");
    });
    expect(await usersWithEmail("stranger@example.com")).toEqual([]);
  });

  it("lets the allowed address in, and signing out ends its session", async () => {
    const signedUp = await auth.api.signUpEmail({
      body: {
        email: ALLOWED,
        password: PASSWORD,
        name: "Test Parent",
        image: "https://example.com/p.png",
      },
      returnHeaders: true,
    });
    const cookies = convertSetCookieToCookie(signedUp.headers);
    const [created] = await usersWithEmail(ALLOWED);
    expect(created).toMatchObject({ email: ALLOWED, image: null });
    expect(await auth.api.getSession({ headers: cookies })).toMatchObject({
      user: { email: ALLOWED },
    });

    await auth.api.signOut({ headers: cookies });

    expect(await auth.api.getSession({ headers: cookies })).toBeNull();
    expect(
      await getDatabase()
        .select()
        .from(session)
        .where(eq(session.userId, created?.id ?? ""))
    ).toEqual([]);
  });

  it("keeps no client address with a session, though rate limiting reads it", async () => {
    await getDatabase().delete(user).where(eq(user.email, ALLOWED));
    await auth.api.signUpEmail({
      body: { email: ALLOWED, password: PASSWORD, name: "Test Parent" },
      headers: new Headers({ "x-real-ip": "203.0.113.7" }),
    });
    const [created] = await usersWithEmail(ALLOWED);
    const sessions = await getDatabase()
      .select()
      .from(session)
      .where(eq(session.userId, created?.id ?? ""));
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.ipAddress).toBeNull();
    await getDatabase().delete(user).where(eq(user.email, ALLOWED));
  });

  it("stores none of Google's tokens when an account is written", async () => {
    const [created] = await getDatabase()
      .insert(user)
      .values({ id: "token-test-user", name: "Test Parent", email: "tokens@example.com" })
      .returning();
    const context = await auth.$context;
    await context.internalAdapter.createAccount({
      accountId: "google-sub",
      providerId: "google",
      userId: created?.id ?? "",
      accessToken: "ya29.test-access-token",
      refreshToken: "test-refresh-token",
      idToken: "eyJ.test-id-token",
      accessTokenExpiresAt: new Date(Date.now() + 3_600_000),
      refreshTokenExpiresAt: new Date(Date.now() + 3_600_000),
    });
    const [stored] = await getDatabase()
      .select()
      .from(account)
      .where(eq(account.userId, created?.id ?? ""));
    expect(stored).toMatchObject({
      providerId: "google",
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
    });
  });
});

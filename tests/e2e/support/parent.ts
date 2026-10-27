import type { Page, TestInfo } from "@playwright/test";
import { betterAuth } from "better-auth";
import { eq } from "drizzle-orm";
import { authOptions } from "../../../src/lib/auth/server.ts";
import { getDatabase } from "../../../src/lib/db/index.ts";
import { user } from "../../../src/lib/db/schema.ts";
import { setTrainerPassword } from "../../../src/lib/trainer/store.ts";
import { PARENTS, PORT, SERVER_ENV } from "./environment.ts";

export const TRAINER_PASSWORD = "end-to-end trainer password";

// The allowlist is read from this process's environment at sign-up, as the server reads its own.
process.env.AUTH_ALLOWED_EMAILS = SERVER_ENV.AUTH_ALLOWED_EMAILS;

// Google cannot sign in here, so the parent signs up by email against the same
// database and secret as the server, which the allowlist lets through.
const auth = betterAuth({
  ...authOptions(SERVER_ENV),
  plugins: [],
  emailAndPassword: { enabled: true },
});

const quiet = () => {};

/**
 * A fresh parent for this test's browser project, signed in on `page`, with
 * the trainer password set unless `withPassword` is false.
 */
export async function signInParent(page: Page, info: TestInfo, { withPassword = true } = {}) {
  const email = PARENTS[info.project.name as keyof typeof PARENTS];
  await getDatabase().delete(user).where(eq(user.email, email));
  const signedUp = await auth.api.signUpEmail({
    body: { email, password: "end-to-end sign-up password", name: "Test Parent" },
    returnHeaders: true,
  });
  const cookies = signedUp.headers.getSetCookie().map((line) => {
    const [pair = ""] = line.split(";");
    const at = pair.indexOf("=");
    return {
      name: pair.slice(0, at),
      value: pair.slice(at + 1),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax" as const,
    };
  });
  await page.context().addCookies(cookies);
  if (withPassword) {
    await setTrainerPassword(signedUp.response.user.id, TRAINER_PASSWORD, quiet);
  }
  return { baseURL: `http://localhost:${PORT}` };
}

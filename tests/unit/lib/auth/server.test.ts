import { afterEach, describe, expect, it, vi } from "vitest";
import { authOptions, getAuth, requireVariables, SESSION_DAYS } from "@/lib/auth/server";

const ENV = {
  BETTER_AUTH_SECRET: "unit-test-secret-of-thirty-two-chars!",
  BETTER_AUTH_URL: "http://localhost:3000",
  GOOGLE_CLIENT_ID: "unit-test-client-id",
  GOOGLE_CLIENT_SECRET: "unit-test-client-secret",
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requireVariables", () => {
  it("hands back each variable, trimmed", () => {
    expect(requireVariables({ ...ENV, GOOGLE_CLIENT_ID: " id " }).GOOGLE_CLIENT_ID).toBe("id");
  });

  it("names every missing or blank variable, and no value", () => {
    expect(() =>
      requireVariables({ ...ENV, BETTER_AUTH_SECRET: " ", GOOGLE_CLIENT_ID: undefined })
    ).toThrow("sign-in needs BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID: see .env.example");
  });
});

describe("authOptions", () => {
  const options = () => authOptions(ENV);

  it("uses Google as the only provider, with the client from the environment", () => {
    expect(Object.keys(options().socialProviders)).toEqual(["google"]);
    expect(options().socialProviders.google).toEqual({
      clientId: "unit-test-client-id",
      clientSecret: "unit-test-client-secret",
    });
  });

  it("keeps a session 90 days, renewed at most daily on use", () => {
    expect(SESSION_DAYS).toBe(90);
    expect(options().session).toEqual({ expiresIn: 90 * 86_400, updateAge: 86_400 });
  });

  it("sends no telemetry", () => {
    expect(options().telemetry).toEqual({ enabled: false });
  });

  it("records a new user by id", async () => {
    const write = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    await options().databaseHooks.user.create.after({ id: "u1" } as never);
    expect(write).toHaveBeenCalledWith("sign-in: user u1 created\n");
    write.mockRestore();
  });

  it.each(["create", "update"] as const)(
    "drops Google's tokens before an account %s is written",
    async (write) => {
      const hook = options().databaseHooks.account[write].before;
      const row = { id: "a1", providerId: "google", accessToken: "token", idToken: "id-token" };
      expect(await hook(row as never)).toEqual({
        data: { id: "a1", providerId: "google", accessToken: null, idToken: null },
      });
    }
  );

  it("asks the allowlist, as the variable reads at sign-in time", () => {
    const validate = options().user.validateUserInfo;
    vi.stubEnv("AUTH_ALLOWED_EMAILS", "parent@example.com");
    expect(validate({ user: { email: "parent@example.com" } })).toBeUndefined();
    vi.stubEnv("AUTH_ALLOWED_EMAILS", "");
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    expect(validate({ user: { email: "parent@example.com" } })).toEqual({
      error: "sign_in_not_allowed",
    });
  });
});

describe("getAuth", () => {
  it("makes the server once, from the environment", () => {
    for (const [name, value] of Object.entries(ENV)) vi.stubEnv(name, value);
    vi.stubEnv("DATABASE_URL", "postgresql://user:secret@127.0.0.1:1/none");
    expect(getAuth()).toBe(getAuth());
  });
});

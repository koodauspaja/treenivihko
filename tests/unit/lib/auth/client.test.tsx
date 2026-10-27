import { describe, expect, it } from "vitest";
import { authClient } from "@/lib/auth/client";

describe("authClient", () => {
  it("is Better Auth's browser client, with Google sign-in and signing out", () => {
    expect(typeof authClient.signIn.social).toBe("function");
    expect(typeof authClient.signOut).toBe("function");
  });
});

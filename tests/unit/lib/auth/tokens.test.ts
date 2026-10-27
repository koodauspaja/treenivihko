import { describe, expect, it } from "vitest";
import { TOKEN_FIELDS, withoutTokens } from "@/lib/auth/tokens";

describe("withoutTokens", () => {
  it("empties every token field a row carries, and keeps the rest", () => {
    const row = {
      id: "a1",
      accountId: "google-sub",
      providerId: "google",
      accessToken: "token",
      refreshToken: "refresh",
      idToken: "id-token",
      accessTokenExpiresAt: new Date(),
      refreshTokenExpiresAt: new Date(),
      scope: "openid email profile",
    };
    expect(withoutTokens(row)).toEqual({
      id: "a1",
      accountId: "google-sub",
      providerId: "google",
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: "openid email profile",
    });
  });

  it("adds no field an update did not carry", () => {
    expect(withoutTokens({ updatedAt: "now" })).toEqual({ updatedAt: "now" });
  });

  it("leaves the row it was given as it was", () => {
    const row = { accessToken: "token" };
    withoutTokens(row);
    expect(row).toEqual({ accessToken: "token" });
  });

  it("covers the token columns Better Auth fills from Google", () => {
    expect(TOKEN_FIELDS).toEqual([
      "accessToken",
      "refreshToken",
      "idToken",
      "accessTokenExpiresAt",
      "refreshTokenExpiresAt",
    ]);
  });
});

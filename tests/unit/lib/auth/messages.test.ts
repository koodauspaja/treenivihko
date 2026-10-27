import { describe, expect, it } from "vitest";
import { SIGN_IN_NOT_ALLOWED } from "@/lib/auth/allowlist";
import { FAILED_MESSAGE, NOT_ALLOWED_MESSAGE, signInErrorMessage } from "@/lib/auth/messages";

describe("signInErrorMessage", () => {
  it("says the account may not sign in, for the allowlist's code", () => {
    expect(signInErrorMessage(SIGN_IN_NOT_ALLOWED)).toBe(NOT_ALLOWED_MESSAGE);
  });

  it("finds the code among several", () => {
    expect(signInErrorMessage(["state_mismatch", SIGN_IN_NOT_ALLOWED])).toBe(NOT_ALLOWED_MESSAGE);
  });

  it.each(["state_mismatch", ["access_denied"]])(
    "says sign-in failed, for any other code %j",
    (code) => {
      expect(signInErrorMessage(code)).toBe(FAILED_MESSAGE);
    }
  );

  it.each([undefined, "", [], [""]])("says nothing when there is no code: %j", (code) => {
    expect(signInErrorMessage(code)).toBeNull();
  });

  it("speaks Finnish", () => {
    expect(NOT_ALLOWED_MESSAGE).toBe("Tällä Google-tilillä ei voi kirjautua Treenivihkoon.");
    expect(FAILED_MESSAGE).toBe("Kirjautuminen ei onnistunut. Yritä uudelleen.");
  });
});

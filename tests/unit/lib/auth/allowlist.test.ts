import { describe, expect, it, vi } from "vitest";
import {
  allowedEmails,
  isAllowed,
  reportUserCreated,
  SIGN_IN_NOT_ALLOWED,
  signInRefusal,
} from "@/lib/auth/allowlist";

describe("allowedEmails", () => {
  it("lower-cases and trims each address, and drops blanks", () => {
    expect(allowedEmails(" Parent@Example.com , ,other@example.com,")).toEqual([
      "parent@example.com",
      "other@example.com",
    ]);
  });

  it.each([undefined, "", " , "])("is empty for %j", (configured) => {
    expect(allowedEmails(configured)).toEqual([]);
  });
});

describe("isAllowed", () => {
  it("ignores case and surrounding spaces", () => {
    expect(isAllowed("  PARENT@example.COM ", "parent@example.com")).toBe(true);
  });

  it("refuses an address that is not on the list", () => {
    expect(isAllowed("stranger@example.com", "parent@example.com")).toBe(false);
  });

  it.each([undefined, "", " , "])("refuses everyone when the list is %j", (configured) => {
    expect(isAllowed("parent@example.com", configured)).toBe(false);
  });

  it.each([undefined, null, 42, ["parent@example.com"]])(
    "refuses %j, which is no address",
    (email) => {
      expect(isAllowed(email, "parent@example.com")).toBe(false);
    }
  );

  it("matches whole addresses, not a part of one", () => {
    expect(isAllowed("parent@example.co", "parent@example.com")).toBe(false);
    expect(isAllowed("parent@example.com", "parent@example.co")).toBe(false);
  });
});

describe("signInRefusal", () => {
  const google = (email: string, emailVerified: unknown = true) => ({
    email,
    emailVerified,
    method: "oauth",
  });

  it("lets a verified Google address on the list through, and records nothing", () => {
    const report = vi.fn();
    expect(
      signInRefusal(google("parent@example.com"), "parent@example.com", report)
    ).toBeUndefined();
    expect(report).not.toHaveBeenCalled();
  });

  it("refuses an address not on the list, and records it without the address", () => {
    const report = vi.fn();
    expect(signInRefusal(google("stranger@example.com"), "parent@example.com", report)).toEqual({
      error: SIGN_IN_NOT_ALLOWED,
    });
    expect(report).toHaveBeenCalledWith("sign-in refused: the address is not on the allowlist");
    expect(JSON.stringify(report.mock.calls)).not.toContain("stranger");
  });

  it.each([false, undefined, "true"])(
    "refuses a listed Google address whose verification is %j",
    (emailVerified) => {
      const report = vi.fn();
      // Built in full: the helper's default would turn undefined into true.
      const identity = { email: "parent@example.com", emailVerified, method: "oauth" };
      expect(signInRefusal(identity, "parent@example.com", report)).toEqual({
        error: SIGN_IN_NOT_ALLOWED,
      });
      expect(report).toHaveBeenCalledWith(
        "sign-in refused: the provider has not verified the address"
      );
      expect(JSON.stringify(report.mock.calls)).not.toContain("parent@");
    }
  );

  it("asks for a provider's verification only of a provider's sign-in", () => {
    const identity = {
      email: "parent@example.com",
      emailVerified: false,
      method: "email-password",
    };
    expect(signInRefusal(identity, "parent@example.com", vi.fn())).toBeUndefined();
  });

  it("records on stderr by default", () => {
    const write = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    signInRefusal(google("stranger@example.com"), "");
    expect(write).toHaveBeenCalledWith("sign-in refused: the address is not on the allowlist\n");
    write.mockRestore();
  });
});

describe("reportUserCreated", () => {
  it("records the new user's id, and nothing else", () => {
    const report = vi.fn();
    reportUserCreated("u1", report);
    expect(report).toHaveBeenCalledWith("sign-in: user u1 created");
  });

  it("records on stderr by default", () => {
    const write = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    reportUserCreated("u1");
    expect(write).toHaveBeenCalledWith("sign-in: user u1 created\n");
    write.mockRestore();
  });
});

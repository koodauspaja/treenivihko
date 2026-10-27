import { describe, expect, it } from "vitest";
import { planPasswordChange } from "../../../scripts/trainer-password-plan.ts";

describe("planPasswordChange", () => {
  it("sets the only user's password", () => {
    expect(planPasswordChange(["u1"], "long enough", "long enough")).toEqual({
      ok: true,
      userId: "u1",
    });
  });

  it.each([[[]], [["u1", "u2"]]])("refuses rather than guess with users %j", (users) => {
    expect(planPasswordChange(users, "long enough", "long enough")).toEqual({
      ok: false,
      refusal: `expected exactly one user, found ${users.length}: sign in with Google first`,
    });
  });

  it("refuses a password the rule refuses", () => {
    expect(planPasswordChange(["u1"], "short", "short")).toEqual({
      ok: false,
      refusal: "a password is 8 to 128 characters",
    });
    expect(planPasswordChange(["u1"], "long enough", "different")).toEqual({
      ok: false,
      refusal: "the two passwords differ",
    });
  });
});

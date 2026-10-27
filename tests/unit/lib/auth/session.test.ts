import { beforeEach, describe, expect, it, vi } from "vitest";

const requestHeaders = new Headers();
const getSession = vi.fn();
const redirect = vi.fn((path: string) => {
  throw new Error(`redirect ${path}`);
});

vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));
vi.mock("@/lib/auth/server", () => ({ getAuth: () => ({ api: { getSession } }) }));

const { currentUser, requireUser } = await import("@/lib/auth/session");

beforeEach(() => {
  requestHeaders.delete("cookie");
  getSession.mockReset();
  redirect.mockClear();
});

const signedIn = () => requestHeaders.set("cookie", "better-auth.session_token=abc.sig");

describe("currentUser", () => {
  it("answers null without asking the auth server when there is no session cookie", async () => {
    expect(await currentUser()).toBeNull();
    expect(getSession).not.toHaveBeenCalled();
  });

  it("hands back only the id and the name of a valid session's user", async () => {
    signedIn();
    getSession.mockResolvedValue({
      user: { id: "u1", name: "Test Parent", email: "parent@example.com" },
      session: { token: "abc" },
    });
    expect(await currentUser()).toEqual({ id: "u1", name: "Test Parent" });
    expect(getSession).toHaveBeenCalledWith({ headers: requestHeaders });
  });

  it("answers null for a cookie whose session the server does not know", async () => {
    signedIn();
    getSession.mockResolvedValue(null);
    expect(await currentUser()).toBeNull();
  });
});

describe("requireUser", () => {
  it("hands back the signed-in user", async () => {
    signedIn();
    getSession.mockResolvedValue({ user: { id: "u1", name: "Test Parent" } });
    expect(await requireUser()).toEqual({ id: "u1", name: "Test Parent" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sends a signed-out browser to the sign-in page", async () => {
    await expect(requireUser()).rejects.toThrow("redirect /kirjaudu");
  });
});

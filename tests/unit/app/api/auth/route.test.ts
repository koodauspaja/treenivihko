import { describe, expect, it, vi } from "vitest";

const handlers = {
  GET: vi.fn(async () => new Response("get")),
  POST: vi.fn(async () => new Response("post")),
};
const server = { name: "the auth server" };

vi.mock("@/lib/auth/server", () => ({ getAuth: () => server }));
vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: (auth: unknown) => (auth === server ? handlers : {}),
}));

const route = await import("@/app/api/auth/[...all]/route");

describe("the auth route", () => {
  it.each(["GET", "POST"] as const)(
    "hands a %s to Better Auth's handler for the server",
    async (method) => {
      const request = new Request("http://localhost:3000/api/auth/session", { method });
      const response = await route[method](request);
      expect(handlers[method]).toHaveBeenCalledWith(request);
      expect(await response.text()).toBe(method.toLowerCase());
    }
  );
});

import { describe, expect, it } from "vitest";
import { SIGN_IN_PATH } from "@/lib/auth/paths";
import { ROUTES, routeRedirects, routeRewrites } from "@/lib/routes";

describe("the route table", () => {
  it("serves the sign-in address from the English sign-in folder", () => {
    expect(ROUTES).toContainEqual([SIGN_IN_PATH, "/sign-in"]);
  });

  it("rewrites each Finnish address to its folder", () => {
    expect(routeRewrites()).toContainEqual({ source: "/kirjaudu", destination: "/sign-in" });
    expect(routeRewrites()).toHaveLength(ROUTES.length);
  });

  it("sends each folder's path back to its address, permanently", () => {
    expect(routeRedirects()).toContainEqual({
      source: "/sign-in",
      destination: "/kirjaudu",
      permanent: true,
    });
    expect(routeRedirects()).toHaveLength(ROUTES.length);
  });

  it("names each address and each folder once, and never the same path for both", () => {
    const addresses = ROUTES.map(([address]) => address);
    const folders = ROUTES.map(([, folder]) => folder);
    expect(new Set(addresses).size).toBe(ROUTES.length);
    expect(new Set(folders).size).toBe(ROUTES.length);
    expect(addresses.filter((address) => folders.includes(address))).toEqual([]);
  });
});

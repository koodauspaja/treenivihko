import { describe, expect, it } from "vitest";
import { SIGN_IN_PATH } from "@/lib/auth/paths";
import { ROUTES, routeRedirects, routeRewrites } from "@/lib/routes";
import {
  EXERCISES_PATH,
  exercisePath,
  IMPORT_PATH,
  NEW_EXERCISE_PATH,
  NICKNAME_PATH,
  TRAINER_PATH,
  UNLOCK_PATH,
} from "@/lib/trainer/paths";

describe("the route table", () => {
  it("serves the sign-in address from the English sign-in folder", () => {
    expect(ROUTES).toContainEqual([SIGN_IN_PATH, "/sign-in"]);
  });

  it("serves the trainer side and its lock page from English folders", () => {
    expect(ROUTES).toContainEqual([TRAINER_PATH, "/trainer"]);
    expect(ROUTES).toContainEqual([UNLOCK_PATH, "/trainer/unlock"]);
    expect([TRAINER_PATH, UNLOCK_PATH]).toEqual(["/valmentaja", "/valmentaja/avaa"]);
  });

  it("serves the nickname and the library, a new exercise and the import before an exercise's id", () => {
    const addresses = ROUTES.map(([address]) => address);
    expect(ROUTES).toContainEqual([NICKNAME_PATH, "/trainer/nickname"]);
    expect(ROUTES).toContainEqual([EXERCISES_PATH, "/trainer/exercises"]);
    expect(ROUTES).toContainEqual([NEW_EXERCISE_PATH, "/trainer/exercises/new"]);
    expect(ROUTES).toContainEqual(["/valmentaja/harjoitteet/:id", "/trainer/exercises/:id"]);
    expect(addresses.indexOf(NEW_EXERCISE_PATH)).toBeLessThan(
      addresses.indexOf("/valmentaja/harjoitteet/:id")
    );
    expect(ROUTES).toContainEqual([IMPORT_PATH, "/trainer/exercises/import"]);
    expect(IMPORT_PATH).toBe("/valmentaja/harjoitteet/tuonti");
    expect(addresses.indexOf(IMPORT_PATH)).toBeLessThan(
      addresses.indexOf("/valmentaja/harjoitteet/:id")
    );
    expect(exercisePath("a b/c")).toBe("/valmentaja/harjoitteet/a%20b%2Fc");
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

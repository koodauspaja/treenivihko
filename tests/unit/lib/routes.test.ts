import { describe, expect, it } from "vitest";
import { SIGN_IN_PATH } from "@/lib/auth/paths";
import { ROUTES, routeRedirects, routeRewrites } from "@/lib/routes";
import {
  EXERCISES_PATH,
  exercisePath,
  IMPORT_PATH,
  NEW_EXERCISE_PATH,
  NEW_PERIOD_PATH,
  NICKNAME_PATH,
  PERIODS_PATH,
  periodPath,
  pickerPath,
  sessionPath,
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

  it("serves the periods, a new period before a period's id, a session and its picker", () => {
    const addresses = ROUTES.map(([address]) => address);
    expect(ROUTES).toContainEqual([PERIODS_PATH, "/trainer/periods"]);
    expect(ROUTES).toContainEqual([NEW_PERIOD_PATH, "/trainer/periods/new"]);
    expect(ROUTES).toContainEqual(["/valmentaja/jaksot/:id", "/trainer/periods/:id"]);
    expect(ROUTES).toContainEqual(["/valmentaja/treenit/:id", "/trainer/sessions/:id"]);
    expect(ROUTES).toContainEqual([
      "/valmentaja/treenit/:id/lisaa/:blockId",
      "/trainer/sessions/:id/add/:blockId",
    ]);
    expect([PERIODS_PATH, NEW_PERIOD_PATH]).toEqual([
      "/valmentaja/jaksot",
      "/valmentaja/jaksot/uusi",
    ]);
    expect(addresses.indexOf(NEW_PERIOD_PATH)).toBeLessThan(
      addresses.indexOf("/valmentaja/jaksot/:id")
    );
    expect(periodPath("a b/c")).toBe("/valmentaja/jaksot/a%20b%2Fc");
    expect(sessionPath("a b/c")).toBe("/valmentaja/treenit/a%20b%2Fc");
    expect(pickerPath("s/1", "b 2")).toBe("/valmentaja/treenit/s%2F1/lisaa/b%202");
  });

  it("serves an exercise of the child's side from an English folder", () => {
    expect(ROUTES).toContainEqual(["/harjoite/:id", "/exercise/:id"]);
  });

  it("serves a session's marking page from an English folder", () => {
    expect(ROUTES).toContainEqual(["/treeni/:id", "/session/:id"]);
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

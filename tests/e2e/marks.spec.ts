/**
 * The child marking a session: the current period's, the previous one's, and
 * none of the next before it starts.
 *
 * decisions/f005-notebook-view.md
 * decisions/f006-session-marks.md
 */

import { expect, type Page, test } from "@playwright/test";
import { type Exercise, readExercise, valuesFrom } from "../../src/lib/exercises/rules.ts";
import { createExercise } from "../../src/lib/exercises/store.ts";
import { addDays, formatDay, spanOf, today } from "../../src/lib/periods/dates.ts";
import {
  addBlock,
  addBlockExercise,
  addSession,
  createPeriod,
  getPeriod,
} from "../../src/lib/periods/store.ts";
import { signInParent } from "./support/parent.ts";

const quiet = () => {};

/** Fixtures saved through the stores, as the trainer side saves them; one that fails fails the test. */
const saved = <T extends { kind: string }>(result: T) => {
  if (result.kind !== "saved") {
    throw new Error(`the fixture was not saved: ${result.kind}`);
  }
  return result as Extract<T, { kind: "saved" }>;
};

const exerciseOf = async (userId: string, overrides: Partial<Exercise>) => {
  const reading = readExercise(
    valuesFrom({
      name: "Harjoite",
      instructions: "Tee näin.",
      videoUrl: null,
      amountKind: "count",
      amount: 10,
      durationMinutes: 5,
      level: 1,
      warmUp: false,
      labels: ["passing", "field", "ball"],
      ...overrides,
    })
  );
  if (!reading.ok) {
    throw new Error(`the fixture breaks a rule: ${JSON.stringify(reading.errors)}`);
  }
  return saved(await createExercise(userId, reading.exercise, quiet)).id;
};

/** A 2-week period from `startsOn`: a session of the ladder, the sprint and the ladder again, then an empty one. */
const periodWithSessions = async (userId: string, startsOn: string) => {
  const ladder = await exerciseOf(userId, { name: "Tikkaat: perusaskel" });
  const sprint = await exerciseOf(userId, { name: "Lähdöt", labels: ["speed", "field"] });
  const periodId = saved(await createPeriod(userId, { startsOn, weeks: 2 }, quiet)).id;
  const sessionId = saved(await addSession(userId, periodId, quiet)).id;
  await addSession(userId, periodId, quiet);
  const blockId = saved(await addBlock(userId, sessionId, "Lämmittely", quiet)).id;
  for (const each of [ladder, sprint, ladder]) {
    await addBlockExercise(userId, blockId, each, quiet);
  }
  return periodId;
};

/** A period's first session's id; a period with none fails the test, rather than visiting a made-up address. */
const firstSessionOf = async (userId: string, periodId: string) => {
  const [first] = (await getPeriod(userId, periodId, quiet))?.sessions ?? [];
  if (first === undefined) {
    throw new Error("the fixture period has no session");
  }
  return first.id;
};

const main = (page: Page) => page.getByRole("main");
const group = (page: Page, name: string) => main(page).getByRole("group", { name });
const save = (page: Page) => main(page).getByRole("button", { name: "Tallenna" }).click();

test("the child marks a session of the current period, changes the mark and removes it", async ({
  page,
}, info) => {
  const { userId } = await signInParent(page, info);
  const startsOn = addDays(today(), -3);
  await periodWithSessions(userId, startsOn);
  await page.goto("/");
  await expect(main(page).getByRole("link", { name: "Merkitse" })).toHaveCount(2);

  await main(page).getByRole("link", { name: "Merkitse" }).first().click();
  await expect(page).toHaveURL(/\/treeni\/[0-9a-f-]{36}$/);
  await expect(main(page).getByRole("heading", { level: 1, name: "Treeni 1" })).toBeVisible();
  await expect(main(page).getByText(`Jakso ${spanOf({ startsOn, weeks: 2 })}`)).toBeVisible();
  await expect(main(page).getByLabel("Milloin?")).toHaveValue(today());
  await expect(group(page, "Mikä oli kivoin?").getByRole("radio")).toHaveCount(3);
  await expect(group(page, "Mikä oli kivoin?")).toContainText("Tikkaat: perusaskel");
  await expect(group(page, "Mikä oli kivoin?")).toContainText("Lähdöt");
  await expect(main(page).getByRole("button", { name: "Poista merkintä" })).toHaveCount(0);
  const width = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    window.innerWidth,
  ]);
  expect(width[0]).toBeLessThanOrEqual(width[1] as number);

  // Each refusal beside its field, with nothing saved.
  await save(page);
  await expect(main(page).getByText("Valitse, teitkö treenin.")).toBeVisible();
  await main(page).getByLabel("Tein kaiken").check();
  await main(page).getByLabel("Milloin?").fill(addDays(startsOn, -1));
  await save(page);
  await expect(main(page).getByText("Valitse päivä jakson alusta tähän päivään.")).toBeVisible();
  await expect(main(page).getByLabel("Tein kaiken")).toBeChecked();
  await main(page).getByLabel("Milloin?").fill(addDays(today(), 1));
  await save(page);
  await expect(main(page).getByText("Valitse päivä jakson alusta tähän päivään.")).toBeVisible();
  await page.goto("/");
  await expect(main(page).getByRole("link", { name: "Merkitse" })).toHaveCount(2);

  const yesterday = addDays(today(), -1);
  await main(page).getByRole("link", { name: "Merkitse" }).first().click();
  await main(page).getByLabel("Tein kaiken").check();
  await main(page).getByLabel("Milloin?").fill(yesterday);
  await main(page).getByRole("radio", { name: "Tosi hyvä" }).check();
  await group(page, "Mikä oli kivoin?").getByLabel("Lähdöt").check();
  await group(page, "Mikä oli tylsin?").getByLabel("Lähdöt").check();
  await group(page, "Mikä oli vaikein?").getByLabel("Tikkaat: perusaskel").check();
  await save(page);
  await expect(page).toHaveURL(/\/$/);
  await expect(main(page).getByText(`Tehty ${formatDay(yesterday)} 😄`)).toBeVisible();
  await expect(main(page).getByRole("link", { name: "Muuta" })).toHaveCount(1);
  await expect(main(page).getByRole("link", { name: "Merkitse" })).toHaveCount(1);

  // The saved mark opens with its choices, and En tehnyt hides and clears the rest.
  await main(page).getByRole("link", { name: "Muuta" }).click();
  await expect(main(page).getByLabel("Tein kaiken")).toBeChecked();
  await expect(main(page).getByLabel("Milloin?")).toHaveValue(yesterday);
  await expect(main(page).getByRole("radio", { name: "Tosi hyvä" })).toBeChecked();
  await expect(group(page, "Mikä oli tylsin?").getByLabel("Lähdöt")).toBeChecked();
  await expect(group(page, "Mikä oli helpoin?").getByLabel("Ohita")).toBeChecked();
  await main(page).getByLabel("En tehnyt").check();
  await expect(main(page).getByLabel("Milloin?")).toBeHidden();
  await expect(group(page, "Mikä oli kivoin?")).toBeHidden();
  await save(page);
  await expect(main(page).getByText("Ei tehty")).toBeVisible();
  await main(page).getByRole("link", { name: "Muuta" }).click();
  await main(page).getByLabel("Tein osan").check();
  await expect(main(page).getByLabel("Milloin?")).toHaveValue(today());
  await expect(group(page, "Mikä oli kivoin?").getByLabel("Ohita")).toBeChecked();
  await expect(group(page, "Miltä treeni tuntui?").getByLabel("Ohita")).toBeChecked();

  await main(page).getByRole("button", { name: "Poista merkintä" }).click();
  await expect(main(page).getByText("Poistetaanko merkintä?")).toBeVisible();
  await main(page).getByRole("button", { name: "Poista", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(main(page).getByRole("link", { name: "Merkitse" })).toHaveCount(2);
  await expect(main(page).getByText("Ei tehty")).toHaveCount(0);
});

test("the child marks a session of the previous period after the next has started", async ({
  page,
}, info) => {
  const { userId } = await signInParent(page, info);
  // An older period, no longer markable; the previous one and the current one are copies of it.
  const olderId = await periodWithSessions(userId, addDays(today(), -40));
  const before = addDays(today(), -20);
  saved(await createPeriod(userId, { startsOn: before, weeks: 2 }, quiet));
  saved(await createPeriod(userId, { startsOn: addDays(today(), -6), weeks: 2 }, quiet));
  await page.goto("/");

  const previous = main(page).locator("section", {
    has: page.getByRole("heading", {
      level: 2,
      name: `Edellinen jakso ${spanOf({ startsOn: before, weeks: 2 })}`,
    }),
  });
  await expect(previous.getByRole("heading", { level: 3 })).toHaveText(["Treeni 1", "Treeni 2"]);
  // Only its sessions, to mark: none of their blocks or exercises.
  for (const text of ["Lämmittely", "Tikkaat: perusaskel", "Lähdöt"]) {
    await expect(previous.getByText(text)).toHaveCount(0);
  }
  await previous.getByRole("link", { name: "Merkitse" }).first().click();

  // A day after the previous period ended is the child training late, and taken.
  const yesterday = addDays(today(), -1);
  await main(page).getByLabel("Tein osan").check();
  await main(page).getByLabel("Milloin?").fill(yesterday);
  await save(page);
  await expect(page).toHaveURL(/\/$/);
  await expect(previous.getByText(`Osittain ${formatDay(yesterday)}`)).toBeVisible();
  await expect(previous.getByRole("link", { name: "Muuta" })).toHaveCount(1);
  await expect(main(page).getByRole("link", { name: "Merkitse" })).toHaveCount(3);

  await page.goto(`/treeni/${await firstSessionOf(userId, olderId)}`);
  await expect(main(page).getByText("Sivua ei löytynyt.")).toBeVisible();
});

test("the next period, before it starts, has nothing to mark", async ({ page }, info) => {
  const { userId } = await signInParent(page, info);
  const periodId = await periodWithSessions(userId, addDays(today(), 2));
  await page.goto("/");
  await expect(main(page).getByText(/^Alkaa /)).toBeVisible();
  await expect(main(page).getByRole("link", { name: "Merkitse" })).toHaveCount(0);
  await page.goto(`/treeni/${await firstSessionOf(userId, periodId)}`);
  await expect(main(page).getByText("Sivua ei löytynyt.")).toBeVisible();
});

test("a session's marking page needs a signed-in browser", async ({ page }) => {
  await page.goto("/treeni/00000000-0000-4000-8000-000000000000");
  await expect(page).toHaveURL(/\/kirjaudu/);
});

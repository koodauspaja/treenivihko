/**
 * The child's progress: the periods that have started with their marks, the
 * picked exercises' counts, and the marks on the trainer side.
 *
 * decisions/f006-session-marks.md
 * decisions/f007-progress.md
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
} from "../../src/lib/periods/store.ts";
import { signInParent, unlockTrainer } from "./support/parent.ts";

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

/** A 2-week period from `startsOn` of three sessions, each a block of the ladder and the sprint. */
const periodWithSessions = async (userId: string, startsOn: string) => {
  const ladder = await exerciseOf(userId, { name: "Tikkaat: perusaskel" });
  const sprint = await exerciseOf(userId, { name: "Lähdöt", labels: ["speed", "field"] });
  const periodId = saved(await createPeriod(userId, { startsOn, weeks: 2 }, quiet)).id;
  for (let n = 0; n < 3; n += 1) {
    const sessionId = saved(await addSession(userId, periodId, quiet)).id;
    const blockId = saved(await addBlock(userId, sessionId, "Lämmittely", quiet)).id;
    for (const each of [ladder, sprint]) {
      await addBlockExercise(userId, blockId, each, quiet);
    }
  }
  return periodId;
};

const main = (page: Page) => page.getByRole("main");
const group = (page: Page, name: string) => main(page).getByRole("group", { name });

test("the child sees their marks and picks on their progress, and the parent on the period", async ({
  page,
}, info) => {
  const { userId } = await signInParent(page, info);
  const startsOn = addDays(today(), -3);
  const periodId = await periodWithSessions(userId, startsOn);
  const yesterday = addDays(today(), -1);

  await page.goto("/");
  await main(page).getByRole("link", { name: "Merkitse" }).first().click();
  await main(page).getByLabel("Tein kaiken").check();
  await main(page).getByLabel("Milloin?").fill(yesterday);
  await main(page).getByRole("radio", { name: "Tosi hyvä" }).check();
  await group(page, "Mikä oli kivoin?").getByLabel("Lähdöt").check();
  await group(page, "Mikä oli vaikein?").getByLabel("Lähdöt").check();
  await group(page, "Mikä oli helpoin?").getByLabel("Tikkaat: perusaskel").check();
  await main(page).getByRole("button", { name: "Tallenna" }).click();
  await expect(page).toHaveURL(/\/$/);

  await main(page).getByRole("link", { name: "Merkitse" }).first().click();
  await main(page).getByLabel("Tein osan").check();
  await group(page, "Mikä oli kivoin?").getByLabel("Lähdöt").check();
  await group(page, "Mikä oli tylsin?").getByLabel("Tikkaat: perusaskel").check();
  await main(page).getByRole("button", { name: "Tallenna" }).click();
  await expect(page).toHaveURL(/\/$/);

  await main(page).getByRole("link", { name: "Omat treenit" }).click();
  await expect(page).toHaveURL(/\/omat-treenit$/);
  await expect(main(page).getByRole("heading", { level: 1, name: "Omat treenit" })).toBeVisible();
  const period = main(page).locator("section", {
    has: page.getByRole("heading", { level: 2, name: `Jakso ${spanOf({ startsOn, weeks: 2 })}` }),
  });
  await expect(period.getByText("Tehty 2/3")).toBeVisible();
  await expect(period.getByText(`Tehty ${formatDay(yesterday)} 😄`)).toBeVisible();
  await expect(period.getByText(`Osittain ${formatDay(today())}`)).toBeVisible();
  await expect(period.getByText("Ei merkitty")).toHaveCount(1);
  const exercises = main(page).locator("section", {
    has: page.getByRole("heading", { level: 2, name: "Harjoitteet" }),
  });
  await expect(exercises.getByRole("listitem")).toHaveText([
    "LähdötKivoin 2 · Vaikein 1",
    "Tikkaat: perusaskelTylsin 1 · Helpoin 1",
  ]);
  await expect(main(page).getByRole("link", { name: "Merkitse" })).toHaveCount(0);
  const width = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    window.innerWidth,
  ]);
  expect(width[0]).toBeLessThanOrEqual(width[1] as number);
  await main(page).getByRole("link", { name: "Takaisin" }).click();
  await expect(page).toHaveURL(/\/$/);

  await unlockTrainer(page);
  await page.goto(`/valmentaja/jaksot/${periodId}`);
  const first = main(page).getByRole("listitem").first();
  await expect(first.getByText(`Tehty ${formatDay(yesterday)} 😄`)).toBeVisible();
  await expect(first.getByText("Kivoin: Lähdöt")).toBeVisible();
  await expect(first.getByText("Helpoin: Tikkaat: perusaskel")).toBeVisible();
  await expect(first.getByText("Vaikein: Lähdöt")).toBeVisible();
  await expect(first.getByText(/^Tylsin: /)).toHaveCount(0);
  await expect(
    main(page).getByRole("listitem").nth(1).getByText("Tylsin: Tikkaat: perusaskel")
  ).toBeVisible();
  await expect(
    main(page)
      .getByRole("listitem")
      .nth(2)
      .getByText(/^(Tehty|Osittain|Ei tehty)/)
  ).toHaveCount(0);
});

test("the progress says nothing has started, and leaves out the next period", async ({
  page,
}, info) => {
  const { userId } = await signInParent(page, info);
  await periodWithSessions(userId, addDays(today(), 2));
  await page.goto("/omat-treenit");
  await expect(main(page).getByText("Jaksoa ei ole vielä aloitettu.")).toBeVisible();
  await expect(main(page).getByText("Harjoitteita ei ole vielä valittu.")).toBeVisible();
  await expect(main(page).getByRole("heading", { level: 2, name: /^Jakso / })).toHaveCount(0);
});

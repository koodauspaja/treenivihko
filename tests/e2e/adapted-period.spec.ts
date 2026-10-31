/**
 * The parent making a new period adapted to the latest one's marks, through
 * the pages.
 *
 * decisions/f004-periods-and-sessions.md
 * decisions/f009-adapted-period.md
 */

import { expect, type Page, test } from "@playwright/test";
import { type Exercise, readExercise, valuesFrom } from "../../src/lib/exercises/rules.ts";
import { createExercise } from "../../src/lib/exercises/store.ts";
import { NO_PICKS } from "../../src/lib/marks/rules.ts";
import { saveMark } from "../../src/lib/marks/store.ts";
import { addDays, formatSpan, lastDayOf, today } from "../../src/lib/periods/dates.ts";
import {
  addBlock,
  addBlockExercise,
  addSession,
  createPeriod,
} from "../../src/lib/periods/store.ts";
import { signInParent, unlockTrainer } from "./support/parent.ts";

const quiet = () => {};

/** Fixtures saved through the stores, as the pages save them; one that fails fails the test. */
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
      labels: ["dribbling", "field", "ball"],
      ...overrides,
    })
  );
  if (!reading.ok) {
    throw new Error(`the fixture breaks a rule: ${JSON.stringify(reading.errors)}`);
  }
  return saved(await createExercise(userId, reading.exercise, quiet)).id;
};

const main = (page: Page) => page.getByRole("main");

/** The current period: one session of the dribble and the sprint, marked 😄 with the sprint liked least. */
const markedPeriod = async (userId: string) => {
  const dribble = await exerciseOf(userId, { name: "Kuljetus" });
  const sprint = await exerciseOf(userId, {
    name: "Lähdöt",
    amountKind: "time",
    amount: 30,
    labels: ["speed", "field"],
  });
  await exerciseOf(userId, {
    name: "Pikalähdöt",
    amountKind: "time",
    amount: 20,
    labels: ["speed", "field"],
  });
  const startsOn = addDays(today(), -3);
  const periodId = saved(await createPeriod(userId, { startsOn, weeks: 2 }, quiet)).id;
  const sessionId = saved(await addSession(userId, periodId, quiet)).id;
  const blockId = saved(await addBlock(userId, sessionId, "Kuljetus ja lähdöt", quiet)).id;
  for (const each of [dribble, sprint]) {
    saved(await addBlockExercise(userId, blockId, each, quiet));
  }
  saved(
    await saveMark(
      userId,
      sessionId,
      {
        status: "done",
        trainedOn: today(),
        feeling: 5,
        picks: { ...NO_PICKS, likedLeast: sprint },
      },
      today(),
      quiet
    )
  );
  return startsOn;
};

test("a new period adapted to the marks lists what changed, and holds it", async ({
  page,
}, info) => {
  const { userId } = await signInParent(page, info);
  const startsOn = await markedPeriod(userId);
  await unlockTrainer(page);

  await page.goto("/valmentaja/jaksot/uusi");
  const choice = page.getByRole("checkbox", { name: "Sovita edellisen jakson merkintöihin" });
  await expect(choice).toBeChecked();
  const nextStart = addDays(lastDayOf(startsOn, 2), 1);
  await expect(page.getByLabel("Alkaa")).toHaveValue(nextStart);
  await page.getByRole("button", { name: "Luo jakso" }).click();

  const span = formatSpan(nextStart, lastDayOf(nextStart, 2));
  await expect(
    main(page).getByRole("heading", { level: 2, name: `Jakso ${span} luotu` })
  ).toBeVisible();
  await expect(main(page).getByRole("listitem")).toHaveText([
    "Treeni 1: Kuljetus 10 kertaa → 12 kertaa",
    "Treeni 1: Lähdöt vaihtui harjoitteeseen Pikalähdöt (20 s)",
  ]);
  await main(page).getByRole("link", { name: "Avaa jakso" }).click();
  await expect(main(page).getByRole("heading", { name: `Jakso ${span}` })).toBeVisible();
  await main(page).getByRole("link", { name: "Treeni 1" }).click();
  await expect(main(page).getByLabel("Kertoja")).toHaveValue("12");
  await expect(main(page).getByText("Pikalähdöt")).toBeVisible();
  await expect(main(page).getByLabel("Sekuntia")).toHaveValue("20");
  await expect(main(page).getByText("Lähdöt", { exact: true })).toHaveCount(0);

  // A reload shows the form again, for another period; the list is gone.
  await page.goto("/valmentaja/jaksot/uusi");
  await expect(page.getByRole("button", { name: "Luo jakso" })).toBeVisible();
  await expect(main(page).getByRole("listitem")).toHaveCount(0);
});

test("unchecked, the choice makes the plain copy; without marks, there is no choice", async ({
  page,
}, info) => {
  const { userId } = await signInParent(page, info);
  const startsOn = await markedPeriod(userId);
  await unlockTrainer(page);

  await page.goto("/valmentaja/jaksot/uusi");
  const choice = page.getByRole("checkbox", { name: "Sovita edellisen jakson merkintöihin" });
  const suggested = await page.getByLabel("Alkaa").inputValue();
  await choice.uncheck();
  // A refusal keeps the choice as it was sent.
  await page.getByLabel("Alkaa").fill(startsOn);
  await page.getByRole("button", { name: "Luo jakso" }).click();
  await expect(main(page).getByRole("alert")).toContainText("menee päällekkäin");
  await expect(choice).not.toBeChecked();
  await page.getByLabel("Alkaa").fill(suggested);
  await page.getByRole("button", { name: "Luo jakso" }).click();
  const nextStart = addDays(lastDayOf(startsOn, 2), 1);
  const span = formatSpan(nextStart, lastDayOf(nextStart, 2));
  await expect(main(page).getByRole("heading", { level: 1, name: `Jakso ${span}` })).toBeVisible();
  await main(page).getByRole("link", { name: "Treeni 1" }).click();
  await expect(main(page).getByLabel("Kertoja")).toHaveValue("10");
  await expect(main(page).getByText("Lähdöt", { exact: true })).toBeVisible();

  // The copy is now the latest period, and it has no marks.
  await page.goto("/valmentaja/jaksot/uusi");
  await expect(main(page).getByText(`Uusi jakso alkaa kopiona jaksosta ${span}.`)).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
});

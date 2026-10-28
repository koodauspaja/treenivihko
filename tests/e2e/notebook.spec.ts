/**
 * The child's side showing the period to copy, and an exercise's page.
 *
 * decisions/f004-periods-and-sessions.md
 * decisions/f005-notebook-view.md
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
  getSession,
  updateBlockExerciseAmount,
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

/** A period from `startsOn` with one session of a block of two exercises, and an empty second session. */
const periodWithSessions = async (userId: string, startsOn: string) => {
  const ladder = await exerciseOf(userId, {
    name: "Tikkaat: perusaskel",
    instructions: "Kaksi askelta sisään.\nYksi ulos.",
    videoUrl: "https://example.com/video",
  });
  const sprint = await exerciseOf(userId, {
    name: "Lähdöt",
    amountKind: "time",
    amount: 90,
    labels: ["speed", "field"],
  });
  const periodId = saved(await createPeriod(userId, { startsOn, weeks: 2 }, quiet)).id;
  const sessionId = saved(await addSession(userId, periodId, quiet)).id;
  await addSession(userId, periodId, quiet);
  const blockId = saved(await addBlock(userId, sessionId, "Lämmittely", quiet)).id;
  await addBlock(userId, sessionId, "Kuljetus", quiet);
  await addBlockExercise(userId, blockId, ladder, quiet);
  await addBlockExercise(userId, blockId, sprint, quiet);
  const [first] = (await getSession(userId, sessionId, quiet))?.blocks[0]?.exercises ?? [];
  await updateBlockExerciseAmount(userId, first?.id ?? "", 12, quiet);
  return { periodId, ladderInBlock: first?.id ?? "" };
};

const main = (page: Page) => page.getByRole("main");

test("the child's side shows the current period to copy, and an exercise's page", async ({
  page,
}, info) => {
  const { userId } = await signInParent(page, info);
  const startsOn = addDays(today(), -3);
  await periodWithSessions(userId, startsOn);
  await page.goto("/");

  await expect(
    main(page).getByRole("heading", { level: 2, name: `Jakso ${spanOf({ startsOn, weeks: 2 })}` })
  ).toBeVisible();
  await expect(main(page).getByText(/^Alkaa/)).toHaveCount(0);
  await expect(main(page).getByRole("heading", { level: 3 })).toHaveText(["Treeni 1", "Treeni 2"]);
  await expect(main(page).getByText("Kenttä · 45 min")).toHaveCount(2);
  await expect(main(page).getByRole("heading", { level: 4 })).toHaveText([
    "Lämmittely",
    "Kuljetus",
  ]);
  await expect(main(page).getByRole("listitem")).toHaveText([
    "Tikkaat: perusaskel – 12 kertaa",
    "Lähdöt – 1 min 30 s",
  ]);
  await expect(main(page).getByText("Treeni on vielä tyhjä.")).toHaveCount(1);
  await expect(main(page).locator("form, input, select, textarea")).toHaveCount(0);
  await expect(main(page).getByRole("button")).toHaveCount(0);
  await expect(main(page).getByRole("link").last()).toHaveText("Valmentaja");
  const width = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    window.innerWidth,
  ]);
  expect(width[0]).toBeLessThanOrEqual(width[1] as number);

  await main(page).getByRole("link", { name: "Tikkaat: perusaskel" }).click();
  await expect(page).toHaveURL(/\/harjoite\/[0-9a-f-]{36}$/);
  await expect(
    main(page).getByRole("heading", { level: 1, name: "Tikkaat: perusaskel" })
  ).toBeVisible();
  await expect(main(page).getByText("12 kertaa")).toBeVisible();
  await expect(main(page).getByText("5 min", { exact: true })).toBeVisible();
  await expect(main(page).getByText("Kaksi askelta sisään.")).toBeVisible();
  await expect(main(page).getByRole("link", { name: "Katso video" })).toHaveAttribute(
    "href",
    "https://example.com/video"
  );
  await main(page).getByRole("link", { name: "Takaisin" }).click();
  await expect(page).toHaveURL(/\/$/);

  await main(page).getByRole("link", { name: "Lähdöt" }).click();
  await expect(main(page).getByText("1 min 30 s")).toBeVisible();
  await expect(main(page).getByRole("link", { name: "Katso video" })).toHaveCount(0);

  await page.goto("/harjoite/00000000-0000-4000-8000-000000000000");
  await expect(main(page).getByText("Sivua ei löytynyt.")).toBeVisible();
});

test("the child's side shows the next period before it starts, and a message with none", async ({
  page,
}, info) => {
  const { userId } = await signInParent(page, info);
  await page.goto("/");
  await expect(main(page).getByText("Jaksoa ei ole vielä tehty.")).toBeVisible();

  // An earlier period, never shown, and the next one, shown before it starts.
  const earlier = await periodWithSessions(userId, addDays(today(), -30));
  const startsOn = addDays(today(), 2);
  saved(await createPeriod(userId, { startsOn, weeks: 1 }, quiet));
  await page.reload();
  await expect(
    main(page).getByRole("heading", { level: 2, name: `Jakso ${spanOf({ startsOn, weeks: 1 })}` })
  ).toBeVisible();
  await expect(main(page).getByText(`Alkaa ${formatDay(startsOn)}.`)).toBeVisible();

  // The next period is a copy of the earlier one, so its sessions show; the earlier one's exercise is not found.
  await expect(main(page).getByRole("heading", { level: 3 })).toHaveText(["Treeni 1", "Treeni 2"]);
  await page.goto(`/harjoite/${earlier.ladderInBlock}`);
  await expect(main(page).getByText("Sivua ei löytynyt.")).toBeVisible();
});

test("the child's side and an exercise's page need a signed-in browser", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/kirjaudu/);
  await page.goto("/harjoite/00000000-0000-4000-8000-000000000000");
  await expect(page).toHaveURL(/\/kirjaudu/);
});

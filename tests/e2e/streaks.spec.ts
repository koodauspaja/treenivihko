/**
 * The streak and the accomplishments on the child's side, and the pauses on
 * the trainer side.
 *
 * decisions/f008-streaks-and-accomplishments.md
 */

import { expect, type Page, test } from "@playwright/test";
import { NO_PICKS } from "../../src/lib/marks/rules.ts";
import { saveMark } from "../../src/lib/marks/store.ts";
import { addDays, formatDay, spanOf, today } from "../../src/lib/periods/dates.ts";
import { addSession, createPeriod, getPeriod } from "../../src/lib/periods/store.ts";
import { pauseSpan } from "../../src/lib/streaks/messages.ts";
import { mondayOf } from "../../src/lib/streaks/rules.ts";
import { signInParent, unlockTrainer } from "./support/parent.ts";

const quiet = () => {};

/** Fixtures saved through the stores, as the pages save them; one that fails fails the test. */
const saved = <T extends { kind: string }>(result: T) => {
  if (result.kind !== "saved") {
    throw new Error(`the fixture was not saved: ${result.kind}`);
  }
  return result as Extract<T, { kind: "saved" }>;
};

const main = (page: Page) => page.getByRole("main");

const fitsWidth = async (page: Page) => {
  const [scroll, inner] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    window.innerWidth,
  ]);
  expect(scroll).toBeLessThanOrEqual(inner as number);
};

test("sessions done in two weeks make a streak, on the child's side and Omat treenit", async ({
  page,
}, info) => {
  const { userId } = await signInParent(page, info);
  // One day for the whole test, so its fixture and expectations agree.
  const day = today();
  // A period from last week's Monday, of two sessions: one done last week, one today.
  const startsOn = addDays(mondayOf(day), -7);
  const periodId = saved(await createPeriod(userId, { startsOn, weeks: 2 }, quiet)).id;
  saved(await addSession(userId, periodId, quiet));
  saved(await addSession(userId, periodId, quiet));
  const sessions = (await getPeriod(userId, periodId, quiet))?.sessions ?? [];
  const lastWeek = addDays(startsOn, 4);
  for (const [each, trainedOn] of [
    [sessions[0], lastWeek],
    [sessions[1], day],
  ] as const) {
    saved(
      await saveMark(
        userId,
        each?.id ?? "",
        { status: "done", trainedOn, feeling: null, picks: NO_PICKS },
        day,
        quiet
      )
    );
  }

  await page.goto("/");
  await expect(main(page).getByText("Putki: 2 viikkoa")).toBeVisible();
  await expect(main(page).getByText(/niin putki/)).toHaveCount(0);

  await main(page).getByRole("link", { name: "Omat treenit" }).click();
  await expect(main(page).getByText("Putki nyt: 2 viikkoa")).toBeVisible();
  await expect(main(page).getByText("Paras putki: 2 viikkoa")).toBeVisible();
  const earned = main(page).locator("section", {
    has: page.getByRole("heading", { level: 2, name: "Saavutukset" }),
  });
  await expect(earned.getByRole("listitem")).toHaveText([
    `Ensimmäinen treeni${formatDay(day)}`,
    `Koko jakso tehty ${spanOf({ startsOn, weeks: 2 })}${formatDay(day)}`,
  ]);
  await expect(main(page).getByText("10 treeniä (2/10)")).toBeVisible();
  await expect(main(page).getByText("4 viikon putki (2/4)")).toBeVisible();
  await fitsWidth(page);
});

test("the parent adds a pause, the child's side shows it, and the parent deletes it", async ({
  page,
}, info) => {
  await signInParent(page, info);
  const day = today();
  await page.goto("/");
  await expect(main(page).getByText("Tee treeni tällä viikolla, niin putki alkaa.")).toBeVisible();

  await unlockTrainer(page);
  await main(page).getByRole("link", { name: "Tauot" }).click();
  await expect(page).toHaveURL(/\/valmentaja\/tauot$/);
  await expect(main(page).getByText("Tauon aikana putki ei katkea.")).toBeVisible();
  await expect(main(page).getByText("Taukoja ei ole.")).toBeVisible();
  await expect(main(page).getByLabel("Alkaa")).toHaveValue(day);
  await expect(main(page).getByLabel("Päättyy")).toHaveValue(addDays(day, 6));
  await main(page).getByRole("button", { name: "Lisää tauko" }).click();
  const span = pauseSpan({ startsOn: day, endsOn: addDays(day, 6) });
  await expect(main(page).getByRole("listitem")).toHaveCount(1);
  await expect(main(page).getByRole("listitem").first()).toContainText(span);
  await fitsWidth(page);

  await page.goto("/");
  await expect(main(page).getByText(`Tauko ${span}: putki ei katkea.`)).toBeVisible();
  await expect(main(page).getByText(/niin putki alkaa/)).toHaveCount(0);

  await page.goto("/valmentaja/tauot");
  await main(page).getByRole("button", { name: "Poista" }).click();
  await expect(main(page).getByText(/^Poistetaanko tauko /)).toBeVisible();
  await main(page).getByRole("button", { name: "Poista", exact: true }).click();
  await expect(main(page).getByText("Taukoja ei ole.")).toBeVisible();
});

test("a pause is refused an end before its start, and a day another pause has", async ({
  page,
}, info) => {
  await signInParent(page, info);
  const day = today();
  await unlockTrainer(page);
  await page.goto("/valmentaja/tauot");
  await main(page).getByLabel("Päättyy").fill(addDays(day, -1));
  await main(page).getByRole("button", { name: "Lisää tauko" }).click();
  await expect(main(page).getByText("Tauko ei voi päättyä ennen alkuaan.")).toBeVisible();
  await expect(main(page).getByLabel("Päättyy")).toHaveValue(addDays(day, -1));
  await expect(main(page).getByText("Taukoja ei ole.")).toBeVisible();

  await main(page).getByLabel("Päättyy").fill(day);
  await main(page).getByRole("button", { name: "Lisää tauko" }).click();
  await expect(main(page).getByRole("listitem")).toHaveCount(1);
  await main(page).getByRole("button", { name: "Lisää tauko" }).click();
  await expect(
    main(page).getByText(`Tauko menee päällekkäin tauon ${formatDay(day)} kanssa.`)
  ).toBeVisible();
  await expect(main(page).getByRole("listitem")).toHaveCount(1);
});

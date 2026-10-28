/**
 * The parent building periods by hand, through the pages.
 *
 * decisions/f002-exercise-library.md
 * decisions/f004-periods-and-sessions.md
 */

import { expect, type Page, test } from "@playwright/test";
import { type Exercise, readExercise, valuesFrom } from "../../src/lib/exercises/rules.ts";
import { createExercise } from "../../src/lib/exercises/store.ts";
import { addDays, formatSpan, lastDayOf, today } from "../../src/lib/periods/dates.ts";
import { signInParent, unlockTrainer } from "./support/parent.ts";

const quiet = () => {};

/** An exercise saved through readExercise, as every write is; a fixture that fails it fails the test. */
const seed = async (userId: string, overrides: Partial<Exercise>) => {
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
  const result = await createExercise(userId, reading.exercise, quiet);
  if (result.kind !== "saved") {
    throw new Error(`the fixture was not saved: ${result.kind}`);
  }
  return result.id;
};

const main = (page: Page) => page.getByRole("main");
const block = (page: Page, theme: string) => main(page).getByRole("region", { name: theme });
/** The session's blocks' themes, in order. */
const themes = (page: Page) =>
  main(page)
    .getByRole("region")
    .evaluateAll((sections) => sections.map((each) => each.getAttribute("aria-label")));
const row = (page: Page, theme: string, name: string) =>
  block(page, theme).getByRole("listitem").filter({ hasText: name });

const addBlock = async (page: Page, theme: string) => {
  const form = main(page).locator("form", {
    has: page.getByRole("button", { name: "Lisää osio" }),
  });
  await form.getByLabel("Osio").fill(theme);
  await form.getByRole("button", { name: "Lisää osio" }).click();
  await expect(block(page, theme)).toBeVisible();
};

const pick = async (page: Page, theme: string, name: string) => {
  await block(page, theme).getByRole("link", { name: "Lisää harjoite" }).click();
  await expect(
    main(page).getByRole("heading", { name: `Lisää harjoite osioon ${theme}` })
  ).toBeVisible();
  await main(page)
    .getByRole("listitem")
    .filter({ hasText: name })
    .getByRole("button", { name: "Lisää" })
    .click();
  await expect(row(page, theme, name)).toBeVisible();
};

test("the menu leads to the periods, and every page of them needs the unlock", async ({
  page,
}, info) => {
  await signInParent(page, info);
  await unlockTrainer(page);
  const links = main(page).getByRole("link");
  await expect(links.first()).toHaveText("Jaksot");
  await links.first().click();
  await expect(page).toHaveURL(/\/valmentaja\/jaksot$/);
  await expect(main(page).getByRole("heading", { name: "Jaksot" })).toBeVisible();
  await expect(main(page).getByText("Jaksoja ei ole vielä.")).toBeVisible();
  await page.getByRole("link", { name: "Takaisin" }).click();
  await expect(page).toHaveURL(/\/valmentaja$/);

  await page.goto("/valmentaja/jaksot/00000000-0000-4000-8000-000000000000");
  await expect(main(page).getByText("Sivua ei löytynyt.")).toBeVisible();
  await page.goto("/valmentaja/treenit/not-a-session");
  await expect(main(page).getByText("Sivua ei löytynyt.")).toBeVisible();

  await page.goto("/valmentaja");
  await page.getByRole("button", { name: "Lukitse ja palaa" }).click();
  await expect(page).toHaveURL(/\/$/);
  for (const address of [
    "/valmentaja/jaksot",
    "/valmentaja/jaksot/uusi",
    "/valmentaja/jaksot/00000000-0000-4000-8000-000000000000",
    "/valmentaja/treenit/00000000-0000-4000-8000-000000000000",
    "/valmentaja/treenit/00000000-0000-4000-8000-000000000000/lisaa/00000000-0000-4000-8000-000000000000",
  ]) {
    await page.goto(address);
    await expect(page).toHaveURL(/\/valmentaja\/avaa$/);
  }
});

test("a period is built by hand, copied into the next, and keeps what it uses", async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  const { userId } = await signInParent(page, info);
  await seed(userId, { name: "Ankka" });
  await seed(userId, {
    name: "Hyppy",
    amountKind: "time",
    amount: 30,
    durationMinutes: 10,
    labels: ["agility", "field"],
  });
  await seed(userId, { name: "Sali", labels: ["strength", "gym"] });
  await unlockTrainer(page);

  // A first period: empty, from today for 2 weeks. Today is read on both sides
  // of the page's own reading, so a run across Finnish midnight still passes.
  const before = today();
  await page.goto("/valmentaja/jaksot/uusi");
  await expect(main(page).getByText("Uusi jakso alkaa tyhjänä.")).toBeVisible();
  const startsOn = await page.getByLabel("Alkaa").inputValue();
  expect([before, today()]).toContain(startsOn);
  const firstSpan = formatSpan(startsOn, lastDayOf(startsOn, 2));
  await expect(page.getByLabel("Kesto")).toHaveValue("2");
  await page.getByRole("button", { name: "Luo jakso" }).click();
  await expect(main(page).getByRole("heading", { name: `Jakso ${firstSpan}` })).toBeVisible();
  await expect(main(page).getByText("Nyt menossa")).toBeVisible();
  await expect(main(page).getByText("Jaksossa ei ole vielä treenejä.")).toBeVisible();
  const firstPeriod = page.url();

  // A session with its defaults, and two blocks of exercises from the picker.
  await page.getByRole("button", { name: "Lisää treeni" }).click();
  await expect(main(page).getByRole("heading", { name: "Treeni 1" })).toBeVisible();
  await expect(page.getByLabel("Kenttä", { exact: true })).toBeChecked();
  for (const item of ["Pallo", "Tikkaat", "Aidat", "Kartiot", "Maali", "Seinä", "Hyppynaru"]) {
    await expect(page.getByLabel(item, { exact: true })).toBeChecked();
  }
  await expect(page.getByLabel("Tavoitekesto (min)")).toHaveValue("45");
  await expect(main(page).getByText("Treenissä ei ole vielä osioita.")).toBeVisible();

  await addBlock(page, "Lämmittely");
  await expect(
    block(page, "Lämmittely").getByText("Osiossa ei ole vielä harjoitteita.")
  ).toBeVisible();
  await block(page, "Lämmittely").getByRole("link", { name: "Lisää harjoite" }).click();
  await expect(
    main(page).getByText(
      "Paikka: Kenttä. Välineet: Pallo, Tikkaat, Aidat, Kartiot, Maali, Seinä, Hyppynaru."
    )
  ).toBeVisible();
  await expect(main(page).getByRole("listitem")).toHaveText([/^Ankka/, /^Hyppy/]);
  await page.getByRole("link", { name: "Takaisin" }).click();
  await pick(page, "Lämmittely", "Ankka");
  await pick(page, "Lämmittely", "Hyppy");
  await addBlock(page, "Laukaus");
  await pick(page, "Laukaus", "Ankka");
  await expect(main(page).getByText("Yhteensä 20 min, tavoite 45 min")).toBeVisible();

  // A refused theme keeps what was typed; an amount changed by its kind's rule.
  const addForm = main(page).locator("form", {
    has: page.getByRole("button", { name: "Lisää osio" }),
  });
  await addForm.getByLabel("Osio").fill("x".repeat(31));
  await addForm.getByRole("button", { name: "Lisää osio" }).click();
  await expect(addForm.getByRole("alert")).toHaveText("Osion nimessä on oltava 1–30 merkkiä.");
  await expect(addForm.getByLabel("Osio")).toHaveValue("x".repeat(31));

  const ankka = row(page, "Lämmittely", "Ankka");
  await ankka.getByLabel("Kertoja").fill("101");
  await ankka.getByRole("button", { name: "Tallenna" }).click();
  await expect(ankka.getByRole("alert")).toHaveText("Kertoja on oltava 1–100.");
  await ankka.getByLabel("Kertoja").fill("12");
  await ankka.getByRole("button", { name: "Tallenna" }).click();
  await expect(ankka.getByRole("status")).toHaveText("Tallennettu.");
  await expect(row(page, "Lämmittely", "Hyppy").getByLabel("Sekuntia")).toHaveValue("30");

  // Moving a block and an exercise.
  await block(page, "Laukaus").getByRole("button", { name: "Ylös" }).click();
  await expect.poll(() => themes(page)).toEqual(["Laukaus", "Lämmittely"]);
  await row(page, "Lämmittely", "Hyppy").getByRole("button", { name: "Ylös" }).click();
  await expect(block(page, "Lämmittely").getByRole("listitem")).toHaveText([/^Hyppy/, /^Ankka/]);

  // The library keeps its own amount.
  await page.goto("/valmentaja/harjoitteet");
  await expect(main(page).getByRole("listitem").filter({ hasText: "Ankka" })).toContainText(
    "Taso Helppo, 10 kertaa, 5 min"
  );

  // A second period starts the day after the first, as a full copy of it.
  const secondStart = addDays(lastDayOf(startsOn, 2), 1);
  const secondSpan = formatSpan(secondStart, lastDayOf(secondStart, 2));
  await page.goto("/valmentaja/jaksot/uusi");
  await expect(
    main(page).getByText(`Uusi jakso alkaa kopiona jaksosta ${firstSpan}.`)
  ).toBeVisible();
  await expect(page.getByLabel("Alkaa")).toHaveValue(secondStart);
  await page.getByRole("button", { name: "Luo jakso" }).click();
  await expect(main(page).getByRole("heading", { name: `Jakso ${secondSpan}` })).toBeVisible();
  await expect(main(page).getByText("Kenttä, 20 / 45 min")).toBeVisible();
  const secondPeriod = page.url();
  await main(page).getByRole("link", { name: "Treeni 1" }).click();
  await expect.poll(() => themes(page)).toEqual(["Laukaus", "Lämmittely"]);
  await expect(block(page, "Lämmittely").getByRole("listitem")).toHaveText([/^Hyppy/, /^Ankka/]);
  await expect(row(page, "Lämmittely", "Ankka").getByLabel("Kertoja")).toHaveValue("12");

  // Moving the second period onto the first is refused, naming it.
  await page.goto(secondPeriod);
  await page.getByLabel("Alkaa").fill(addDays(startsOn, 3));
  await page.getByRole("button", { name: "Tallenna" }).click();
  await expect(main(page).getByRole("alert")).toHaveText(
    `Jakso menee päällekkäin jakson ${firstSpan} kanssa.`
  );
  await page.reload();
  await expect(page.getByLabel("Alkaa")).toHaveValue(secondStart);

  // Deleting a library exercise the periods use is refused, naming them.
  await page.goto("/valmentaja/harjoitteet");
  await main(page).getByRole("link", { name: "Ankka" }).click();
  await page.getByRole("button", { name: "Poista harjoite" }).click();
  await page.getByRole("button", { name: "Poista", exact: true }).click();
  await expect(main(page).getByRole("alert")).toHaveText(
    `Harjoite on käytössä jaksoissa: ${firstSpan}, ${secondSpan}. Poista se ensin niiden treeneistä.`
  );
  await page.goto("/valmentaja/harjoitteet");
  await expect(main(page).getByRole("link", { name: "Ankka" })).toBeVisible();

  // Deleting a session renumbers the one after it.
  await page.goto(firstPeriod);
  await page.getByRole("button", { name: "Lisää treeni" }).click();
  await expect(main(page).getByRole("heading", { name: "Treeni 2" })).toBeVisible();
  await page.goto(firstPeriod);
  await main(page).getByRole("link", { name: "Treeni 1" }).click();
  await page.getByRole("button", { name: "Poista treeni" }).click();
  await main(page)
    .locator("form", { hasText: "Poistetaanko treeni 1?" })
    .getByRole("button", { name: "Poista", exact: true })
    .click();
  await expect(main(page).getByRole("heading", { name: `Jakso ${firstSpan}` })).toBeVisible();
  await expect(main(page).getByRole("link", { name: /^Treeni / })).toHaveText(["Treeni 1"]);
  await expect(main(page).getByText("Kenttä, 0 / 45 min")).toBeVisible();

  // Deleting a period, after its confirmation, leaves the other.
  await page.getByRole("button", { name: "Poista jakso" }).click();
  await expect(
    main(page).getByText(`Poistetaanko jakso ${firstSpan} ja sen treenit?`)
  ).toBeVisible();
  await page.getByRole("button", { name: "Poista", exact: true }).click();
  await expect(page).toHaveURL(/\/valmentaja\/jaksot$/);
  await expect(main(page).getByRole("listitem")).toHaveText([`${secondSpan}1 treeni`]);
});
